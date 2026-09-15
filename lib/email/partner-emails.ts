// lib/email/partner-emails.ts
//
// Mirrors lib/email/submission-emails.ts: swallow errors, log on failure,
// never block the API response. Called from the two Partner API routes
// after a successful save.

import type {
  PartnerApplicantPayload,
  PartnerAmbassadorPayload,
} from "@/lib/submissions/partner-types";
import {
  getEmailConfig,
  sendResendEmail,
  type ResendAttachment,
} from "./resend";
import {
  renderPartnerApplicantInternal,
  renderPartnerApplicantConfirmation,
  renderPartnerAmbassadorInternal,
  renderPartnerAmbassadorConfirmation,
} from "./partner-templates";

const MARK_ATTACHMENT: ResendAttachment = {
  filename: "icon.png",
  path: "https://twinlanterns.co/icon.png",
  content_id: "mark",
  content_type: "image/png",
};

export async function sendPartnerApplicantEmails(input: {
  payload: PartnerApplicantPayload;
  qualified: boolean;
  reasons: string[];
}): Promise<void> {
  const { configured, to } = getEmailConfig();
  const { payload, qualified, reasons } = input;

  if (!configured || !to) {
    console.log(
      `[partner] applicant saved (${qualified ? "qualified" : "unqualified"}) — no email configured`,
    );
    return;
  }

  const fullName = [payload.firstName, payload.lastName]
    .filter(Boolean)
    .join(" ");

  try {
    await sendResendEmail({
      to: [to],
      subject: `New Partner applicant (${qualified ? "qualified" : "unqualified"}) — ${fullName}`,
      html: renderPartnerApplicantInternal(payload, { qualified, reasons }),
      attachments: [MARK_ATTACHMENT],
    });
  } catch (err) {
    console.error("resend request failed (partner applicant internal)", err);
  }

  if (!payload.email) return;

  try {
    await sendResendEmail({
      to: [payload.email],
      subject: qualified
        ? "You're in — Partner"
        : "We've got your application — Partner",
      html: renderPartnerApplicantConfirmation(payload, { qualified }),
      attachments: [MARK_ATTACHMENT],
    });
  } catch (err) {
    console.error("resend request failed (partner applicant confirmation)", err);
  }
}

export async function sendPartnerAmbassadorEmails(input: {
  payload: PartnerAmbassadorPayload;
  code: string;
  referralUrl: string;
}): Promise<void> {
  const { configured, to } = getEmailConfig();
  const { payload, code, referralUrl } = input;

  if (!configured || !to) {
    console.log(
      `[partner] ambassador saved — code ${code} — no email configured`,
    );
    return;
  }

  try {
    await sendResendEmail({
      to: [to],
      subject: `New Partner ambassador — ${payload.name}`,
      html: renderPartnerAmbassadorInternal(payload, { code }),
      attachments: [MARK_ATTACHMENT],
    });
  } catch (err) {
    console.error("resend request failed (partner ambassador internal)", err);
  }

  try {
    await sendResendEmail({
      to: [payload.email],
      subject: "You're a Partner ambassador — here's your link",
      html: renderPartnerAmbassadorConfirmation(payload, { code, referralUrl }),
      attachments: [MARK_ATTACHMENT],
    });
  } catch (err) {
    console.error("resend request failed (partner ambassador confirmation)", err);
  }
}