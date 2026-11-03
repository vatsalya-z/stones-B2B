import { createConsoleProvider, createResendProvider, type EmailProvider } from "@stone/email";

/** Choose the email provider from configuration. */
export function getEmailProvider(env: NodeJS.ProcessEnv = process.env): EmailProvider {
  if (env.RESEND_API_KEY && env.EMAIL_FROM) {
    return createResendProvider({ apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM });
  }
  return createConsoleProvider();
}
