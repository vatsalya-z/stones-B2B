"use server";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase";
import {
  loginSchema,
  registerSchema,
  sanitizeNextPath,
  type LoginInput,
  type RegisterInput,
} from "@stone/validation";

// ---------------------------------------------------------------------------
// signUp — creates a new Supabase Auth user.
// The `data` payload passes full_name and account_type to the
// handle_new_user trigger which creates the profile + assigns the role.
// ---------------------------------------------------------------------------
export async function signUp(raw: RegisterInput, nextPath?: string | null) {
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }
  const { email, password, fullName, accountType } = parsed.data;
  const safeNext = sanitizeNextPath(nextPath, "/dashboard");
  const callbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback?next=${encodeURIComponent(safeNext)}`;

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, account_type: accountType },
      emailRedirectTo: callbackUrl,
    },
  });
  if (error) return { error: error.message };
  if (data.session) {
    return { success: true, redirectTo: safeNext };
  }
  return { success: true, redirectTo: "/auth/verify-email" };
}

// ---------------------------------------------------------------------------
// signIn — password authentication with safe post-login return URL.
// ---------------------------------------------------------------------------
export async function signIn(raw: LoginInput, nextPath?: string | null) {
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }
  const { email, password } = parsed.data;
  const safeNext = sanitizeNextPath(nextPath, "/dashboard");
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  return { success: true, redirectTo: safeNext };
}

// ---------------------------------------------------------------------------
// signOut — invalidates the session and redirects home.
// ---------------------------------------------------------------------------
export async function signOut() {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}

// ---------------------------------------------------------------------------
// forgotPassword — sends a password reset email with a redirect URL.
// ---------------------------------------------------------------------------
export async function forgotPassword(formData: FormData) {
  const email = (formData.get("email") as string | null)?.trim().toLowerCase() ?? "";
  if (!email) return { error: "Email is required" };
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/reset-password`,
  });
  if (error) return { error: error.message };
  return { success: true };
}

// ---------------------------------------------------------------------------
// resetPassword — called after the user clicks the reset link and lands
// on the reset-password page; that page exchanges the token client-side
// (via the Supabase JS client), then calls this action with the new password.
// ---------------------------------------------------------------------------
export async function resetPassword(formData: FormData) {
  const password = (formData.get("password") as string | null) ?? "";
  if (password.length < 10) return { error: "Password must be at least 10 characters" };
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  redirect("/dashboard");
}
