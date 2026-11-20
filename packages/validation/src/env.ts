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

export function parsePublicEnv(source: Record<string, string | undefined>): PublicEnv {
  // If running outside unit tests, provide production hosted Supabase fallback if missing
  const fallbackUrl =
    process.env.NODE_ENV !== "test" ? "https://rgmasamasslqintssyrh.supabase.co" : undefined;
  const fallbackKey =
    process.env.NODE_ENV !== "test" ? "sb_publishable_bELVUlNZWChpsaJFnDk0wQ_3XZinJef" : undefined;

  const merged = {
    ...source,
    NEXT_PUBLIC_SUPABASE_URL: source.NEXT_PUBLIC_SUPABASE_URL || fallbackUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: source.NEXT_PUBLIC_SUPABASE_ANON_KEY || fallbackKey,
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
