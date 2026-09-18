// lib/email/verification-emails.ts
//
// Reuses the shared transport (resend.ts) and templating (templates.ts),
// same as submission-emails.ts / partner-emails.ts. Unlike those, a failed
// send here isn't just a lost notification — it's the applicant's only way
// to get their code — so unlike the rest of the app's email flows this one
// is deliberately NOT swallowed by the caller; lib/verification/store.ts
// lets it throw.

import { getEmailConfig, sendResendEmail, MARK_ATTACHMENT } from "./resend";
import { renderVerificationCode } from "./templates";

export async function sendVerificationCodeEmail(
  email: string,
  code: string,
): Promise<void> {
  const { configured } = getEmailConfig();

  if (!configured) {
    // No Resend key set (e.g. local dev) — log so the flow stays testable.
    console.log(`[verify] code for ${email}: ${code} (no email configured)`);
    return;
  }

  await sendResendEmail({
    to: [email],
    subject: `Your Twin Lanterns verification code: ${code}`,
    html: renderVerificationCode(code),
    attachments: [MARK_ATTACHMENT],
  });
}
