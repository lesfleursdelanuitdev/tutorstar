// Transactional email.
//
// Real delivery goes through Resend's HTTP API (no SDK dependency — just
// `fetch`) when RESEND_API_KEY is set. Without a key, emails are logged to the
// server console instead of sent, so the app runs end-to-end in local dev with
// no email provider configured. Switching providers (e.g. SMTP) is a change to
// `sendEmail` alone — callers keep the same interface.

const FROM = process.env.EMAIL_FROM ?? "TutorStar <onboarding@resend.dev>";

export type OutboundEmail = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail(email: OutboundEmail): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.info(
      `[email] not sent (no RESEND_API_KEY set) — to=${email.to} subject="${email.subject}"`,
    );
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: email.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Email send failed (${res.status}): ${detail}`);
  }
}

// ---------------------------------------------------------------------------
// Templates
//
// Email clients ignore <style> blocks and external CSS, so everything is
// inlined. `emailLayout` gives every message the same branded frame.
// ---------------------------------------------------------------------------

export function emailLayout(heading: string, bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="padding:24px 32px;border-bottom:1px solid #f3f4f6;">
                <span style="font-size:18px;font-weight:700;color:#111827;">TutorStar</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;color:#374151;font-size:15px;line-height:1.6;">
                <h1 style="margin:0 0 16px;font-size:20px;color:#111827;">${heading}</h1>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;border-top:1px solid #f3f4f6;color:#9ca3af;font-size:12px;">
                TutorStar — tutoring, organised.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function emailButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;font-size:15px;">${label}</a>`;
}

// Password-reset message. `url` is the ready-to-use reset link Better Auth
// hands us (it validates the token, then redirects to the /reset-password page).
export function resetPasswordEmail(name: string, url: string): OutboundEmail {
  const html = emailLayout(
    "Reset your password",
    `<p style="margin:0 0 20px;">Hi ${name}, we received a request to reset your TutorStar password. Click below to choose a new one. This link expires in 1 hour.</p>
     <p style="margin:0 0 24px;">${emailButton(url, "Reset password")}</p>
     <p style="margin:0;color:#6b7280;font-size:13px;">If you didn't ask for this, you can safely ignore this email — your password won't change.</p>`,
  );
  return {
    to: "", // filled by caller
    subject: "Reset your TutorStar password",
    html,
    text: `Hi ${name}, reset your TutorStar password using this link (expires in 1 hour): ${url}\n\nIf you didn't request this, ignore this email.`,
  };
}
