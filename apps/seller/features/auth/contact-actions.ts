"use server";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

export type ContactActionResult = {
  success: boolean;
  error?: string;
  fieldErrors?: Partial<Record<"name" | "email" | "message", string>>;
};

export async function submitContactEnquiry(
  _prevState: ContactActionResult,
  formData: FormData,
): Promise<ContactActionResult> {
  const raw = {
    name: (formData.get("name") as string | null)?.trim() ?? "",
    email: (formData.get("email") as string | null)?.trim().toLowerCase() ?? "",
    message: (formData.get("message") as string | null)?.trim() ?? "",
  };

  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: ContactActionResult["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as "name" | "email" | "message";
      if (!fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    return { success: false, error: "Please fix the errors below.", fieldErrors };
  }

  const { name, email, message } = parsed.data;
  // Log the enquiry — no CRM configured yet
  console.log("[StonesDekho Contact Enquiry]", { name, email, message, timestamp: new Date().toISOString() });

  return { success: true };
}
