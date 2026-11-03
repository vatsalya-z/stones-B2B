export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/** Provider-agnostic sender so the vendor can be swapped via configuration. */
export interface EmailProvider {
  send(message: EmailMessage): Promise<{ id: string }>;
}

/** Resend adapter using the REST API (no SDK dependency). */
export function createResendProvider(config: { apiKey: string; from: string }): EmailProvider {
  return {
    async send(message) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: config.from,
          to: message.to,
          subject: message.subject,
          html: message.html,
          text: message.text,
        }),
      });
      if (!res.ok) throw new Error(`Email provider error: HTTP ${res.status}`);
      const body = (await res.json()) as { id?: string };
      if (!body.id) throw new Error("Email provider returned no message id");
      return { id: body.id };
    },
  };
}

/** Logs instead of sending; used in development when no key is configured. */
export function createConsoleProvider(): EmailProvider {
  return {
    async send(message) {
      console.info(`[email:dev] to=${message.to} subject=${message.subject}`);
      return { id: `dev-${Date.now()}` };
    },
  };
}
