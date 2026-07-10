// Transactional email.
//
// Real delivery goes through Resend's HTTP API (no SDK dependency — just
// `fetch`) when RESEND_API_KEY is set. Without a key, emails are logged to the
// server console instead of sent, so the app runs end-to-end in local dev with
// no email provider configured. Switching providers (e.g. SMTP) is a change to
// `sendEmail` alone — callers keep the same interface.

import { formatCents } from "./money";

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
  <body style="margin:0;padding:0;background:#efeae1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#efeae1;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e6e1d7;">
            <tr>
              <td style="padding:24px 32px;border-bottom:1px solid #efeae1;">
                <span style="font-size:18px;font-weight:700;color:#2b2b28;">TutorStar</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;color:#45443f;font-size:15px;line-height:1.6;">
                <h1 style="margin:0 0 16px;font-size:20px;color:#2b2b28;">${heading}</h1>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;border-top:1px solid #efeae1;color:#9ca3af;font-size:12px;">
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
  return `<a href="${href}" style="display:inline-block;background:#3f8f7d;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;font-size:15px;">${label}</a>`;
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

// A self-contained invoice: the whole bill (line items + totals) lives in the
// email body, so the client needs no login or link to read it.
export function invoiceEmail(params: {
  number: number;
  clientName: string;
  lineItems: { description: string; amountCents: number }[];
  totalCents: number;
  paidCents: number;
  balanceCents: number;
  issuedOn: string | null;
  dueOn: string | null;
}): OutboundEmail {
  const rowStyle =
    'style="padding:8px 0;border-bottom:1px solid #efeae1;font-size:14px;"';
  const lineRows = params.lineItems
    .map(
      (li) =>
        `<tr>
           <td ${rowStyle}>${escapeHtml(li.description)}</td>
           <td ${rowStyle} align="right" style="padding:8px 0;border-bottom:1px solid #efeae1;font-size:14px;white-space:nowrap;">${formatCents(li.amountCents)}</td>
         </tr>`,
    )
    .join("");

  const totalRow = (label: string, value: string, bold = false) =>
    `<tr>
       <td align="right" style="padding:6px 0;font-size:14px;${bold ? "font-weight:700;color:#2b2b28;" : "color:#6b7280;"}">${label}</td>
       <td align="right" style="padding:6px 0 6px 24px;font-size:14px;white-space:nowrap;${bold ? "font-weight:700;color:#2b2b28;" : "color:#45443f;"}">${value}</td>
     </tr>`;

  const html = emailLayout(
    `Invoice #${params.number}`,
    `<p style="margin:0 0 20px;">Hi ${escapeHtml(params.clientName)}, here is your invoice from TutorStar.</p>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border-collapse:collapse;">
       ${lineRows}
     </table>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
       ${totalRow("Total", formatCents(params.totalCents))}
       ${params.paidCents > 0 ? totalRow("Paid", `-${formatCents(params.paidCents)}`) : ""}
       ${totalRow("Amount due", formatCents(params.balanceCents), true)}
     </table>
     ${params.dueOn ? `<p style="margin:20px 0 0;color:#6b7280;font-size:13px;">Due by ${params.dueOn}.</p>` : ""}`,
  );

  const textLines = [
    `Invoice #${params.number} from TutorStar`,
    "",
    ...params.lineItems.map(
      (li) => `${li.description}  —  ${formatCents(li.amountCents)}`,
    ),
    "",
    `Total: ${formatCents(params.totalCents)}`,
    ...(params.paidCents > 0 ? [`Paid: -${formatCents(params.paidCents)}`] : []),
    `Amount due: ${formatCents(params.balanceCents)}`,
    ...(params.dueOn ? ["", `Due by ${params.dueOn}.`] : []),
  ];

  return {
    to: "", // filled by caller
    subject: `Invoice #${params.number} from TutorStar`,
    html,
    text: textLines.join("\n"),
  };
}

export function progressReportEmail(params: {
  studentName: string;
  clientName: string;
  periodStart: string;
  periodEnd: string;
  summary: string;
  content: {
    goals: {
      title: string;
      subjectName: string | null;
      stepsCompleted: { title: string }[];
      complete: boolean;
    }[];
    assessments: {
      seriesName: string;
      subjectName: string | null;
      points: { takenOn: string; rawScore: string; maxScore: string }[];
    }[];
  };
}): OutboundEmail {
  const goalBlocks =
    params.content.goals.length === 0
      ? `<p style="margin:0 0 12px;color:#6b7280;font-size:14px;">No shared goal progress in this period.</p>`
      : params.content.goals
          .map((g) => {
            const steps =
              g.stepsCompleted.length === 0
                ? ""
                : `<ul style="margin:8px 0 0;padding-left:18px;">${g.stepsCompleted
                    .map(
                      (s) =>
                        `<li style="margin:0 0 4px;">${escapeHtml(s.title)}</li>`,
                    )
                    .join("")}</ul>`;
            const subject = g.subjectName
              ? ` <span style="color:#6b7280;">· ${escapeHtml(g.subjectName)}</span>`
              : "";
            const done = g.complete
              ? ` <span style="color:#3f8f7d;font-weight:600;">(complete)</span>`
              : "";
            return `<div style="margin:0 0 16px;">
              <p style="margin:0;font-weight:600;color:#2b2b28;">${escapeHtml(g.title)}${subject}${done}</p>
              ${steps}
            </div>`;
          })
          .join("");

  const assessmentBlocks =
    params.content.assessments.length === 0
      ? `<p style="margin:0 0 12px;color:#6b7280;font-size:14px;">No shared assessments in this period.</p>`
      : params.content.assessments
          .map((s) => {
            const subject = s.subjectName
              ? ` <span style="color:#6b7280;">· ${escapeHtml(s.subjectName)}</span>`
              : "";
            const points = s.points
              .map((p) => {
                const pct =
                  Number(p.maxScore) > 0
                    ? Math.round(
                        (Number(p.rawScore) / Number(p.maxScore)) * 1000,
                      ) / 10
                    : 0;
                return `<li style="margin:0 0 4px;">${escapeHtml(p.takenOn)} — ${escapeHtml(String(Number(p.rawScore)))}/${escapeHtml(String(Number(p.maxScore)))} (${pct}%)</li>`;
              })
              .join("");
            return `<div style="margin:0 0 16px;">
              <p style="margin:0;font-weight:600;color:#2b2b28;">${escapeHtml(s.seriesName)}${subject}</p>
              <ul style="margin:8px 0 0;padding-left:18px;">${points}</ul>
            </div>`;
          })
          .join("");

  const html = emailLayout(
    `Progress report — ${escapeHtml(params.studentName)}`,
    `<p style="margin:0 0 16px;">Hi ${escapeHtml(params.clientName)}, here is a progress update for ${escapeHtml(params.studentName)} covering <strong>${escapeHtml(params.periodStart)}</strong> to <strong>${escapeHtml(params.periodEnd)}</strong>.</p>
     <p style="margin:0 0 20px;white-space:pre-wrap;">${escapeHtml(params.summary)}</p>
     <h2 style="margin:0 0 12px;font-size:16px;color:#2b2b28;">Goals</h2>
     ${goalBlocks}
     <h2 style="margin:24px 0 12px;font-size:16px;color:#2b2b28;">Assessments</h2>
     ${assessmentBlocks}`,
  );

  const text = [
    `Progress report — ${params.studentName}`,
    `Period: ${params.periodStart} to ${params.periodEnd}`,
    "",
    params.summary,
    "",
    "Goals:",
    ...(params.content.goals.length === 0
      ? ["(none)"]
      : params.content.goals.flatMap((g) => [
          `- ${g.title}${g.complete ? " (complete)" : ""}`,
          ...g.stepsCompleted.map((s) => `  · ${s.title}`),
        ])),
    "",
    "Assessments:",
    ...(params.content.assessments.length === 0
      ? ["(none)"]
      : params.content.assessments.flatMap((s) => [
          `- ${s.seriesName}`,
          ...s.points.map(
            (p) => `  · ${p.takenOn}: ${p.rawScore}/${p.maxScore}`,
          ),
        ])),
  ].join("\n");

  return {
    to: "",
    subject: `Progress report for ${params.studentName}`,
    html,
    text,
  };
}

// Line-item descriptions are user-authored, so escape before interpolating
// into the email HTML.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
