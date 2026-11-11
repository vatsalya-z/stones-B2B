"use server";

import { z } from "zod";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getCurrentUser, getUserRoles } from "@/lib/auth";
import { createAdminClient } from "@stone/database/admin";
import { dispatchTransactionalEmailIfConfigured } from "@/lib/email-notifications";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PHONE_REGEX = /^\+?[0-9\s\-()]{7,25}$/;

const ALLOWED_UNITS = [
  "sq_ft",
  "sq_m",
  "piece",
  "ton",
  "metric_ton",
  "slab",
  "box",
  "custom",
];

// Sliding-window in-memory rate limiter: max 5 enquiries per IP+Email in 60 seconds
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;
const rateLimitStore = new Map<string, number[]>();

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const history = rateLimitStore.get(key) ?? [];
  const recent = history.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    rateLimitStore.set(key, recent);
    return false;
  }
  recent.push(now);
  rateLimitStore.set(key, recent);
  return true;
}

const supplierEnquirySchema = z.object({
  sellerId: z.string().trim().min(1, "Seller ID is required"),
  sellerSlug: z.string().trim().min(1, "Seller slug is required"),
  sellerName: z.string().trim().min(1, "Seller name is required"),
  name: z.string().trim().min(2, "Full name must be at least 2 characters").max(100),
  companyName: z.string().trim().max(120).optional().nullable(),
  email: z.string().trim().email("Please enter a valid email address").max(120),
  phone: z
    .string()
    .trim()
    .min(7, "Please enter a valid phone number with country code")
    .max(25)
    .regex(PHONE_REGEX, "Please enter a valid phone format, e.g. +91 98765 43210")
    .refine(
      (v) => {
        const digits = v.replace(/\D/g, "");
        return digits.length >= 7 && digits.length <= 15;
      },
      "Phone number must contain between 7 and 15 digits",
    ),
  material: z.string().trim().min(2, "Please specify the required stone material").max(100),
  quantity: z
    .number({ invalid_type_error: "Quantity must be a valid number" })
    .positive("Quantity must be greater than zero"),
  unit: z.string().default("sq_ft"),
  deliveryLocation: z.string().trim().max(200).optional().nullable(),
  message: z
    .string()
    .trim()
    .min(10, "Requirement description must be at least 10 characters")
    .max(2000, "Message cannot exceed 2000 characters"),
  clientRequestId: z.string().trim().optional().nullable(),
  honeypot: z.string().max(0, "Spam detected").optional().nullable(),
});

export type SupplierEnquiryField =
  | "name"
  | "companyName"
  | "email"
  | "phone"
  | "material"
  | "quantity"
  | "unit"
  | "deliveryLocation"
  | "message";

export interface SupplierEnquiryActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: Partial<Record<SupplierEnquiryField, string>>;
  referenceNumber?: string;
  isGuest?: boolean;
}

/**
 * Resolves a valid seller_profiles UUID from either a provided sellerId or sellerSlug.
 * Never creates invalid foreign-key relations with mock/demo strings.
 */
async function resolveSellerUuid(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  sellerId: string,
  sellerSlug: string,
): Promise<string | null> {
  if (UUID_REGEX.test(sellerId)) {
    const { data } = await supabaseAdmin
      .from("seller_profiles")
      .select("id")
      .eq("id", sellerId)
      .maybeSingle();
    if (data?.id) return data.id;
  }

  if (sellerSlug) {
    const { data } = await supabaseAdmin
      .from("seller_profiles")
      .select("id")
      .eq("slug", sellerSlug)
      .maybeSingle();
    if (data?.id) return data.id;
  }

  return null;
}

export async function submitSupplierEnquiry(
  _prevState: SupplierEnquiryActionResult,
  formData: FormData,
): Promise<SupplierEnquiryActionResult> {
  try {
    const rawQuantity = formData.get("quantity");
    const numQuantity = rawQuantity !== null && rawQuantity !== "" ? Number(rawQuantity) : NaN;

    const raw = {
      sellerId: (formData.get("seller_id") as string | null)?.trim() ?? "",
      sellerSlug: (formData.get("seller_slug") as string | null)?.trim() ?? "",
      sellerName: (formData.get("seller_name") as string | null)?.trim() ?? "",
      name: (formData.get("name") as string | null)?.trim() ?? "",
      companyName: (formData.get("company_name") as string | null)?.trim() || null,
      email: (formData.get("email") as string | null)?.trim().toLowerCase() ?? "",
      phone: (formData.get("phone") as string | null)?.trim() ?? "",
      material: (formData.get("material") as string | null)?.trim() ?? "",
      quantity: numQuantity,
      unit: ((formData.get("unit") as string | null)?.trim() || "sq_ft"),
      deliveryLocation: (formData.get("delivery_location") as string | null)?.trim() || null,
      message: (formData.get("message") as string | null)?.trim() ?? "",
      clientRequestId: (formData.get("client_request_id") as string | null)?.trim() || null,
      honeypot: (formData.get("hp_website") as string | null)?.trim() || null,
    };

    // 1. Zod Validation & Honeypot Check
    const parsed = supplierEnquirySchema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<SupplierEnquiryField, string>> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as SupplierEnquiryField;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      return {
        success: false,
        error: "Please correct the highlighted fields.",
        fieldErrors,
      };
    }

    const data = parsed.data;

    // 2. Server-side Rate Limiting
    let clientIp = "127.0.0.1";
    try {
      const h = await headers();
      clientIp = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "127.0.0.1";
    } catch {
      // outside request context
    }
    const rateLimitKey = `enq:${clientIp}:${data.email}`;
    if (!checkRateLimit(rateLimitKey)) {
      return {
        success: false,
        error: "Too many enquiries submitted in a short time. Please wait a minute before trying again.",
      };
    }

    const clientRequestId =
      data.clientRequestId && UUID_REGEX.test(data.clientRequestId)
        ? data.clientRequestId
        : randomUUID();

    const unit = ALLOWED_UNITS.includes(data.unit) ? data.unit : "sq_ft";

    // 3. Auth State & Privilege Context
    const user = await getCurrentUser();
    const roles = await getUserRoles();
    const isBuyer = Boolean(user && roles.includes("buyer"));

    // Privileged server client (service-role) for durable lead capture
    const supabaseAdmin = createAdminClient();

    // 4. Idempotency Check (Scoped to Requester Identity)
    let finalClientRequestId = clientRequestId;
    const { data: existing } = await supabaseAdmin
      .from("enquiries")
      .select("id, buyer_id, guest_email")
      .eq("client_request_id", clientRequestId)
      .maybeSingle();

    if (existing) {
      const isOwner = isBuyer
        ? existing.buyer_id === user?.id
        : existing.guest_email === data.email;

      if (isOwner) {
        return {
          success: true,
          referenceNumber: `ENQ-${existing.id.slice(0, 8).toUpperCase()}`,
          isGuest: !user,
        };
      }
      // Colliding client_request_id from a different identity: regenerate UUID to prevent cross-account collision
      finalClientRequestId = randomUUID();
    }

    // 5. Secure Seller Association
    const resolvedSellerId = await resolveSellerUuid(
      supabaseAdmin,
      data.sellerId,
      data.sellerSlug,
    );

    const enquiryTitle = `Sourcing Requirement: ${data.material}`.slice(0, 200);

    // 6. Permanent Database Persistence
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("enquiries")
      .insert({
        buyer_id: isBuyer && user ? user.id : null,
        seller_id: resolvedSellerId,
        enquiry_title: enquiryTitle,
        description: data.message,
        quantity: data.quantity,
        unit,
        delivery_location: data.deliveryLocation,
        client_request_id: finalClientRequestId,
        currency: "INR",
        guest_name: isBuyer ? null : data.name,
        guest_email: isBuyer ? null : data.email,
        guest_phone: isBuyer ? null : data.phone,
        guest_company: isBuyer ? null : data.companyName,
        enquiry_type: "direct",
        specifications: {
          material: data.material,
          target_seller_slug: data.sellerSlug,
          target_seller_name: data.sellerName,
        },
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      if (insertError?.code === "23505") {
        // Unique violation on client_request_id: handle simultaneous concurrent submissions safely
        const { data: conflictRow } = await supabaseAdmin
          .from("enquiries")
          .select("id, buyer_id, guest_email")
          .eq("client_request_id", finalClientRequestId)
          .maybeSingle();

        if (conflictRow) {
          const isOwner = isBuyer
            ? conflictRow.buyer_id === user?.id
            : conflictRow.guest_email === data.email;

          if (isOwner) {
            return {
              success: true,
              referenceNumber: `ENQ-${conflictRow.id.slice(0, 8).toUpperCase()}`,
              isGuest: !user,
            };
          }
        }
      }

      console.error("[submitSupplierEnquiry] DB insert error:", insertError?.message);
      return {
        success: false,
        error: "We could not record your enquiry due to a database issue. Please try again.",
      };
    }

    const refNum = `ENQ-${inserted.id.slice(0, 8).toUpperCase()}`;

    // Revalidate paths for active buyer sessions
    if (isBuyer) {
      revalidatePath("/buyer/dashboard");
      revalidatePath("/buyer/enquiries");
    }

    // 7. Seller Notification Dispatch (In-App is triggered by DB trigger; transactional email if configured)
    if (resolvedSellerId) {
      try {
        const { data: sellerRow } = await supabaseAdmin
          .from("seller_profiles")
          .select("business_email, business_name")
          .eq("id", resolvedSellerId)
          .maybeSingle();

        if (sellerRow?.business_email) {
          await dispatchTransactionalEmailIfConfigured({
            to: sellerRow.business_email,
            subject: `New Sourcing Enquiry for ${data.material} [${refNum}]`,
            heading: "New Trade Lead Received",
            bodyText: `A prospective buyer has submitted a requirement for ${data.quantity} ${unit} of ${data.material}. Log in to StoneB2B Seller Portal to review and send a quotation.`,
            ctaLabel: "View Enquiry in Seller Portal",
            ctaPath: `/seller/enquiries/${inserted.id}`,
          });
        }
      } catch (notifyErr) {
        console.warn("[submitSupplierEnquiry] Non-fatal notification error:", notifyErr);
      }
    }

    // 8. Structured Audit Log (Safe: No plaintext personal details or phone/email logged)
    console.log("[StoneB2B Trade Lead Persisted]", {
      referenceNumber: refNum,
      enquiryId: inserted.id,
      sellerId: resolvedSellerId ?? data.sellerId,
      sellerSlug: data.sellerSlug,
      material: data.material,
      quantity: data.quantity,
      unit,
      isGuest: !user,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      referenceNumber: refNum,
      isGuest: !user,
    };
  } catch (err) {
    console.error("[submitSupplierEnquiry] Server error:", err);
    return {
      success: false,
      error: "An unexpected error occurred while transmitting your enquiry. Please try again.",
    };
  }
}
