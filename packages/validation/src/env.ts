import { z } from "zod";

/** Variables safe to ship to the browser. */
export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});
export type PublicEnv = z.infer<typeof publicEnvSchema>;

/** Server-only secrets. Never import this schema into client components. */
export const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(1).optional(),
  SENTRY_DSN: z.string().url().optional(),
});
export type ServerEnv = z.infer<typeof serverEnvSchema>;

function format(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
}

/** Treat empty strings (from blank .env entries) as unset. */
function clean(source: Record<string, string | undefined>): Record<string, string | undefined> {
  return Object.fromEntries(Object.entries(source).map(([k, v]) => [k, v === "" ? undefined : v]));
}

export const HOSTED_SUPABASE_PROJECT_REF = "rgmasamasslqintssyrh";
export const HOSTED_SUPABASE_URL = "https://rgmasamasslqintssyrh.supabase.co";
export const HOSTED_SUPABASE_ANON_KEY = "sb_publishable_bELVUlNZWChpsaJFnDk0wQ_3XZinJef";

export function resolvePublicSupabaseUrl(raw?: string | null): string {
  if (!raw) return HOSTED_SUPABASE_URL;
  const url = raw.trim().replace(/^["']|["']$/g, "").replace(/\/+$/, "");
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return HOSTED_SUPABASE_URL;
  }
  if (
    process.env.NODE_ENV === "production" &&
    (url.includes("127.0.0.1") || url.includes("localhost") || url.includes("placeholder"))
  ) {
    return HOSTED_SUPABASE_URL;
  }
  return url;
}

export function resolvePublicSupabaseAnonKey(raw?: string | null, url?: string | null): string {
  if (!raw) return HOSTED_SUPABASE_ANON_KEY;
  const key = raw.trim().replace(/^["']|["']$/g, "");

  // If accidentally swapped URL into KEY
  if (key.startsWith("http://") || key.startsWith("https://")) {
    return HOSTED_SUPABASE_ANON_KEY;
  }
  // If local docker demo key was pasted into hosted config
  if (key.includes("supabase-demo") || key.includes("placeholder")) {
    return HOSTED_SUPABASE_ANON_KEY;
  }
  // If using the hosted StonesDekho Supabase instance, ensure the key is valid
  const targetUrl = url || process.env.NEXT_PUBLIC_SUPABASE_URL || HOSTED_SUPABASE_URL;
  if (targetUrl.includes(HOSTED_SUPABASE_PROJECT_REF)) {
    if (key !== HOSTED_SUPABASE_ANON_KEY && !key.startsWith("eyJ")) {
      return HOSTED_SUPABASE_ANON_KEY;
    }
  }
  return key;
}

export function parsePublicEnv(source: Record<string, string | undefined>): PublicEnv {
  let url = source.NEXT_PUBLIC_SUPABASE_URL;
  let key = source.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (process.env.NODE_ENV !== "test") {
    url = resolvePublicSupabaseUrl(url);
    key = resolvePublicSupabaseAnonKey(key, url);
  }

  const merged = {
    ...source,
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: key,
  };

  const r = publicEnvSchema.safeParse(clean(merged));
  if (!r.success) throw new Error(`Invalid public environment: ${format(r.error)}`);
  return r.data;
}

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const r = serverEnvSchema.safeParse(clean(source));
  if (!r.success) throw new Error(`Invalid server environment: ${format(r.error)}`);
  return r.data;
}
