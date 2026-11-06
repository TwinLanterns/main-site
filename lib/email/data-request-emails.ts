// lib/email/data-request-emails.ts
//
// Buyer request notifications. Same contract as submission-emails.ts:
// best-effort, never blocks the API response (the request is already saved).
// The internal email sets reply-to to the buyer so the team can answer by
// just hitting Reply.

import { inquiryDetails, type DataRequestPayload } from "@/lib/submissions/data-request";
import { getEmailConfig, sendResendEmailSafely, MARK_ATTACHMENT } from "./resend";
import {
  COLOR,
  brandHeader,
  escapeHtml,
  pill,
  renderKeyValueTable,
  shell,
  title,
} from "./templates";

function renderInternal(p: DataRequestPayload): string {
  const inner = `
    ${brandHeader()}
    ${pill("Data request")}
    ${title(`New message from ${escapeHtml(p.name)}`)}
    ${renderKeyValueTable([
      ["Name", p.name],
      ["Email", p.email],
      ...inquiryDetails(p),
      ["Message", p.message || "(none)"],
    ])}
    <p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:${COLOR.muted}">Reply to this email to answer ${escapeHtml(p.name)} directly.</p>
  `;
  return shell(inner, { preheader: p.message.slice(0, 120) });
}

function renderConfirmation(p: DataRequestPayload): string {
  const firstName = p.name.split(/\s+/)[0] || "there";
  const inner = `
    ${brandHeader()}
    ${title("Message received")}
    <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${COLOR.ink}">Hi ${escapeHtml(firstName)},</p>
    <p style="margin:0;font-size:15px;line-height:1.6;color:${COLOR.ink}">Thanks for reaching out. We'll get back to you shortly. If you think of anything else in the meantime, just reply to this email.</p>
    <p style="margin:26px 0 0;font-size:15px;line-height:1.6;color:${COLOR.muted}">— Twin Lanterns</p>
  `;
  return shell(inner, { preheader: "We got your message and will be in touch soon." });
}

export async function sendDataRequestEmails(p: DataRequestPayload): Promise<void> {
  const { configured, to } = getEmailConfig();
  if (!configured || !to) {
    console.log(`[data-request] saved for ${p.email} — no email configured`);
    return;
  }

  await sendResendEmailSafely(
    {
      to: [to],
      subject: `New data request — ${p.name}`,
      html: renderInternal(p),
      attachments: [MARK_ATTACHMENT],
      replyTo: p.email,
    },
    "data request internal",
  );

  await sendResendEmailSafely(
    {
      to: [p.email],
      subject: "We got your message — Twin Lanterns",
      html: renderConfirmation(p),
      attachments: [MARK_ATTACHMENT],
    },
    "data request confirmation",
  );
}
