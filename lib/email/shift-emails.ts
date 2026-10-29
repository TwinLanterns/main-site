// lib/email/shift-emails.ts
//
// Shift claim notifications. Same contract as data-request-emails.ts:
// best-effort, never blocks the API response (the claim is already saved).
// The internal email sets reply-to to the filmer. Also the access-code email
// sent from /admin → Shifts, which does report failures.

import type {
  ClaimedShift,
  ShiftClaimPayload,
} from "@/lib/submissions/film-shifts";
import {
  SHIFT_TIME_ZONE_LABEL,
  formatShiftDay,
  formatShiftRange,
} from "@/lib/shift-time";
import {
  getEmailConfig,
  sendResendEmail,
  sendResendEmailSafely,
  MARK_ATTACHMENT,
} from "./resend";
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

/* ------------------------------- access codes ------------------------------- */

function renderShiftCode(name: string, code: string, link: string): string {
  const firstName = name.split(/\s+/)[0] || "there";
  const inner = `
    ${brandHeader()}
    ${title("Your filming shift code")}
    <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${COLOR.ink}">Hi ${escapeHtml(firstName)},</p>
    <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:${COLOR.ink}">Here's your code for the Twin Lanterns shift board. Enter it to see open filming shifts and take the ones that work for you.</p>
    <p style="margin:0 0 22px;font-size:32px;font-weight:600;letter-spacing:0.2em;color:${COLOR.ink}">${escapeHtml(code)}</p>
    <p style="margin:0 0 22px"><a href="${escapeHtml(link)}" style="display:inline-block;background:${COLOR.ink};color:${COLOR.white};text-decoration:none;font-size:15px;padding:12px 22px;border-radius:999px">Open the shift board</a></p>
    <p style="margin:0;font-size:13px;line-height:1.6;color:${COLOR.muted}">The code is just for you, so please don't share it. Questions? Reply to this email.</p>
  `;
  return shell(inner, { preheader: `Your shift code is ${code}.` });
}

/**
 * Emails a filmer their access code. Unlike the notifications above this
 * throws on failure: the admin needs to know whether it went out.
 */
export async function sendShiftCodeEmail(args: {
  name: string;
  email: string;
  /** Formatted for people, e.g. "K7QM-X2PD". */
  code: string;
  /** Absolute /shifts link with the code prefilled. */
  link: string;
}): Promise<void> {
  const { configured, to } = getEmailConfig();
  if (!configured) throw new Error("Email isn't configured (RESEND_API_KEY missing)");

  await sendResendEmail({
    to: [args.email],
    subject: "Your Twin Lanterns filming shift code",
    html: renderShiftCode(args.name, args.code, args.link),
    attachments: [MARK_ATTACHMENT],
    replyTo: to,
  });
}
