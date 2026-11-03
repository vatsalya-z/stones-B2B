"use server";

import { z } from "zod";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { isValidCalendarDate } from "@stone/validation";
import { getCurrentUser, getUserRoles } from "@/lib/auth";
import { createAdminClient } from "@stone/database/admin";
import { dispatchTransactionalEmailIfConfigured } from "@/lib/email-notifications";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PHONE_REGEX = /^\+?[0-9\s\-()]{7,25}$/;

// Sliding-window in-memory rate limiter: max 5 RFQs per IP+Email in 60 seconds
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

const rfqSchema = z.object({
  supplierSlug: z.string().trim().optional().nullable(),
  supplierId: z.string().trim().optional().nullable(),
  materialType: z.string().trim().min(2, "Please select or enter the stone material").max(100),
  stoneVariety: z.string().trim().max(120).optional().nullable(),
  quantity: z
    .number({ invalid_type_error: "Quantity must be a valid number" })
    .positive("Quantity must be greater than zero"),
  unit: z.string().default("sq_ft"),
  thickness: z.string().default("18mm"),
  finish: z.string().default("Polished"),
  dimensions: z.string().trim().max(150).optional().nullable(),
  deliveryLocation: z.string().trim().min(2, "Please provide the project delivery city or sea port").max(200),
  requiredDeliveryDate: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine(
      (val) => !val || isValidCalendarDate(val),
      "Please provide delivery date in valid YYYY-MM-DD calendar format",
    ),
  projectNotes: z
    .string()
    .trim()
    .min(10, "Please provide at least 10 characters describing your project requirements")
    .max(3000, "Notes cannot exceed 3000 characters"),
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  companyName: z.string().trim().max(120).optional().nullable(),
  email: z.string().trim().email("Please enter a valid business email").max(120),
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
  clientRequestId: z.string().trim().optional().nullable(),
  honeypot: z.string().max(0, "Spam detected").optional().nullable(),
});

export type RfqField =
  | "materialType"
  | "stoneVariety"
  | "quantity"
  | "unit"
  | "thickness"
  | "finish"
  | "dimensions"
  | "deliveryLocation"
  | "requiredDeliveryDate"
  | "projectNotes"
  | "name"
  | "companyName"
  | "email"
  | "phone";

export interface RfqActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: Partial<Record<RfqField, string>>;
  referenceNumber?: string;
  isGuest?: boolean;
}

/**
 * Resolves a valid seller_profiles UUID from either a provided supplierId or supplierSlug.
 */
async function resolveSupplierUuid(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  supplierId: string | null | undefined,
  supplierSlug: string | null | undefined,
): Promise<string | null> {
  if (supplierId && UUID_REGEX.test(supplierId)) {
    const { data } = await supabaseAdmin
      .from("seller_profiles")
      .select("id")
      .eq("id", supplierId)
      .maybeSingle();
    if (data?.id) return data.id;
  }

  if (supplierSlug) {
    const { data } = await supabaseAdmin
      .from("seller_profiles")
      .select("id")
      .eq("slug", supplierSlug)
      .maybeSingle();
    if (data?.id) return data.id;
  }

  return null;
}

export async function submitPublicRfq(
  _prevState: RfqActionResult,
  formData: FormData,
): Promise<RfqActionResult> {
  try {
    const rawQuantity = formData.get("quantity");
    const numQuantity = rawQuantity !== null && rawQuantity !== "" ? Number(rawQuantity) : NaN;

    const raw = {
      supplierSlug: (formData.get("supplier_slug") as string | null)?.trim() || null,
      supplierId: (formData.get("supplier_id") as string | null)?.trim() || null,
      materialType: (formData.get("material_type") as string | null)?.trim() ?? "",
      stoneVariety: (formData.get("stone_variety") as string | null)?.trim() || null,
      quantity: numQuantity,
      unit: ((formData.get("unit") as string | null)?.trim() || "sq_ft"),
      thickness: ((formData.get("thickness") as string | null)?.trim() || "18mm"),
      finish: ((formData.get("finish") as string | null)?.trim() || "Polished"),
      dimensions: (formData.get("dimensions") as string | null)?.trim() || null,
      deliveryLocation: ((formData.get("delivery_location") || formData.get("deliveryLocation")) as string | null)?.trim() ?? "",
      requiredDeliveryDate: ((formData.get("required_delivery_date") || formData.get("requiredDeliveryDate")) as string | null)?.trim() || null,
      projectNotes: ((formData.get("project_notes") || formData.get("projectNotes")) as string | null)?.trim() ?? "",
      name: (formData.get("name") as string | null)?.trim() ?? "",
      companyName: (formData.get("company_name") as string | null)?.trim() || null,
      email: (formData.get("email") as string | null)?.trim().toLowerCase() ?? "",
      phone: (formData.get("phone") as string | null)?.trim() ?? "",
      clientRequestId: (formData.get("client_request_id") as string | null)?.trim() || null,
      honeypot: (formData.get("hp_project_url") as string | null)?.trim() || null,
    };

    // 1. Zod Validation & Honeypot Check
    const parsed = rfqSchema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<RfqField, string>> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as RfqField;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      return {
        success: false,
        error: "Please complete all required fields correctly.",
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
    const rateLimitKey = `rfq:${clientIp}:${data.email}`;
    if (!checkRateLimit(rateLimitKey)) {
      return {
        success: false,
        error: "Too many RFQs submitted in a short time. Please wait a minute before trying again.",
      };
    }

    const clientRequestId =
      data.clientRequestId && UUID_REGEX.test(data.clientRequestId)
        ? data.clientRequestId
        : randomUUID();

    // 3. Auth State Check
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
          referenceNumber: `RFQ-${existing.id.slice(0, 8).toUpperCase()}`,
          isGuest: !user,
        };
      }
      // Colliding client_request_id from a different identity: regenerate UUID to prevent cross-account collision
      finalClientRequestId = randomUUID();
    }

    // 5. Supplier Association
    const resolvedSellerId = await resolveSupplierUuid(
      supabaseAdmin,
      data.supplierId,
      data.supplierSlug,
    );

    const enquiryTitle = `Architectural RFQ: ${data.materialType}${data.stoneVariety ? ` (${data.stoneVariety})` : ""}`.slice(0, 200);

    // 6. Permanent Database Persistence with Structured Specifications
    const specificationsPayload = {
      material_type: data.materialType,
      stone_variety: data.stoneVariety,
      thickness: data.thickness,
      finish: data.finish,
      dimensions: data.dimensions,
      delivery_location: data.deliveryLocation,
      required_delivery_date: data.requiredDeliveryDate,
      project_notes: data.projectNotes,
      target_supplier_slug: data.supplierSlug,
    };

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("enquiries")
      .insert({
        buyer_id: isBuyer && user ? user.id : null,
        seller_id: resolvedSellerId,
        enquiry_title: enquiryTitle,
        description: data.projectNotes,
        quantity: data.quantity,
        unit: data.unit,
        delivery_location: data.deliveryLocation,
        required_delivery_date: data.requiredDeliveryDate || null,
        client_request_id: finalClientRequestId,
        currency: "INR",
        guest_name: isBuyer ? null : data.name,
        guest_email: isBuyer ? null : data.email,
        guest_phone: isBuyer ? null : data.phone,
        guest_company: isBuyer ? null : data.companyName,
        enquiry_type: "rfq",
        specifications: specificationsPayload,
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
              referenceNumber: `RFQ-${conflictRow.id.slice(0, 8).toUpperCase()}`,
              isGuest: !user,
            };
          }
        }
      }

      console.error("[submitPublicRfq] DB insert error:", insertError?.message);
      return {
        success: false,
        error: "We could not record your RFQ due to a database issue. Please try again.",
      };
    }

    const refNum = `RFQ-${inserted.id.slice(0, 8).toUpperCase()}`;

    // Revalidate paths for active buyer sessions
    if (isBuyer) {
      revalidatePath("/buyer/dashboard");
      revalidatePath("/buyer/rfqs");
      revalidatePath("/buyer/enquiries");
    }

    // 7. Supplier Notification Dispatch
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
            subject: `New Architectural RFQ: ${data.materialType} [${refNum}]`,
            heading: "New Custom Quotation Request",
            bodyText: `A project requirement for ${data.quantity} ${data.unit} of ${data.materialType} (${data.finish}, ${data.thickness}) has been requested. Log in to StoneB2B Seller Portal to respond with proforma quotation.`,
            ctaLabel: "Review RFQ in Seller Portal",
            ctaPath: `/seller/enquiries/${inserted.id}`,
          });
        }
      } catch (notifyErr) {
        console.warn("[submitPublicRfq] Non-fatal notification error:", notifyErr);
      }
    }

    // 8. Structured Audit Log (Safe: No plaintext personal details or phone/email logged)
    console.log("[StoneB2B Public RFQ Persisted]", {
      referenceNumber: refNum,
      enquiryId: inserted.id,
      targetSupplierSlug: data.supplierSlug,
      targetSupplierId: resolvedSellerId ?? data.supplierId,
      materialType: data.materialType,
      stoneVariety: data.stoneVariety,
      quantity: data.quantity,
      unit: data.unit,
      thickness: data.thickness,
      finish: data.finish,
      isGuest: !user,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      referenceNumber: refNum,
      isGuest: !user,
    };
  } catch (err) {
    console.error("[submitPublicRfq] Server error:", err);
    return {
      success: false,
      error: "An unexpected error occurred while processing your RFQ. Please try again.",
    };
  }
}
