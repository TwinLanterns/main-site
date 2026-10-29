// lib/email/shift-emails.ts
//
// Shift claim notifications. Same contract as data-request-emails.ts:
// best-effort, never blocks the API response (the claim is already saved).
// The internal email sets reply-to to the filmer.

import type {
  ClaimedShift,
  ShiftClaimPayload,
} from "@/lib/submissions/film-shifts";
import {
  SHIFT_TIME_ZONE_LABEL,
  formatShiftDay,
  formatShiftRange,
} from "@/lib/shift-time";
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

function when(s: ClaimedShift): string {
  return `${formatShiftDay(s.starts_at)}, ${formatShiftRange(s.starts_at, s.ends_at)} (${SHIFT_TIME_ZONE_LABEL})`;
}

function shiftRows(s: ClaimedShift): [string, string][] {
  return [
    ["When", when(s)],
    ["Camera", s.camera],
    ...(s.location ? ([["Where", s.location]] as [string, string][]) : []),
    ...(s.notes ? ([["Notes", s.notes]] as [string, string][]) : []),
  ];
}

function renderInternal(p: ShiftClaimPayload, s: ClaimedShift): string {
  const inner = `
    ${brandHeader()}
    ${pill("Filming shift")}
    ${title(`${escapeHtml(p.name)} took a shift`)}
    ${renderKeyValueTable([
      ["Name", p.name],
      ["Email", p.email],
      ["Phone", p.phone],
      ...shiftRows(s),
    ])}
  `;
  return shell(inner, { preheader: when(s) });
}

function renderConfirmation(p: ShiftClaimPayload, s: ClaimedShift): string {
  const firstName = p.name.split(/\s+/)[0] || "there";
  const inner = `
    ${brandHeader()}
    ${title("You're on the schedule")}
    <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${COLOR.ink}">Hi ${escapeHtml(firstName)},</p>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:${COLOR.ink}">Thanks for taking a filming shift. Here are the details:</p>
    ${renderKeyValueTable(shiftRows(s))}
    <p style="margin:22px 0 0;font-size:15px;line-height:1.6;color:${COLOR.ink}">Can't make it? Reply to this email as early as you can so we can hand the camera to someone else.</p>
    <p style="margin:26px 0 0;font-size:15px;line-height:1.6;color:${COLOR.muted}">— Twin Lanterns</p>
  `;
  return shell(inner, { preheader: when(s) });
}

export async function sendShiftClaimEmails(
  p: ShiftClaimPayload,
  s: ClaimedShift,
): Promise<void> {
  const { configured, to } = getEmailConfig();
  if (!configured || !to) {
    console.log(`[shifts] claim saved for ${p.email} — no email configured`);
    return;
  }

  await sendResendEmailSafely(
    {
      to: [to],
      subject: `Shift taken — ${p.name}, ${formatShiftDay(s.starts_at)}`,
      html: renderInternal(p, s),
      attachments: [MARK_ATTACHMENT],
      replyTo: p.email,
    },
    "shift claim internal",
  );

  await sendResendEmailSafely(
    {
      to: [p.email],
      subject: `Your filming shift — ${formatShiftDay(s.starts_at)}`,
      html: renderConfirmation(p, s),
      attachments: [MARK_ATTACHMENT],
      // Cancellations should reach the team, not the no-reply sender.
      replyTo: to,
    },
    "shift claim confirmation",
  );
}
