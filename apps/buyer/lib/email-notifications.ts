import "server-only";

export interface TransactionalEmailPayload {
  to: string | null | undefined;
  subject: string;
  heading: string;
  bodyText: string;
  ctaLabel?: string;
  ctaPath?: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Optional, provider-agnostic transactional email dispatcher.
 * - Uses Resend REST API only when both `RESEND_API_KEY` and `EMAIL_FROM` are configured.
 * - Never blocks core database/chat mutations and never requires a paid service to run.
 */
export async function dispatchTransactionalEmailIfConfigured(
  payload: TransactionalEmailPayload,
): Promise<{ sent: boolean; mode: "resend" | "skipped" }> {
  const recipient = payload.to?.trim();
  if (!recipient || !recipient.includes("@")) {
    return { sent: false, mode: "skipped" };
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();

  if (!apiKey || !from) {
    return { sent: false, mode: "skipped" };
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const ctaHref = payload.ctaPath ? `${appUrl}${payload.ctaPath}` : null;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1c1917; background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 12px;">
      <p style="margin: 0 0 8px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #d97706;">StonesDekho Marketplace</p>
      <h2 style="margin: 0 0 12px; font-size: 18px; color: #1c1917;">${escapeHtml(payload.heading)}</h2>
      <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #44403c;">${escapeHtml(payload.bodyText)}</p>
      ${
        ctaHref && payload.ctaLabel
          ? `<a href="${escapeHtml(ctaHref)}" style="display: inline-block; padding: 10px 18px; background: #1c1917; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: 600;">${escapeHtml(payload.ctaLabel)}</a>`
          : ""
      }
    </div>
  `.trim();

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: recipient,
        subject: payload.subject.slice(0, 180),
        html,
        text: `${payload.heading}\n\n${payload.bodyText}${ctaHref ? `\n\nOpen: ${ctaHref}` : ""}`,
      }),
    });

    if (!res.ok) {
      console.warn(`[email-notifications] provider returned HTTP ${res.status}`);
      return { sent: false, mode: "resend" };
    }

    return { sent: true, mode: "resend" };
  } catch (err) {
    console.warn("[email-notifications] non-fatal dispatch error:", (err as Error).message);
    return { sent: false, mode: "resend" };
  }
}

