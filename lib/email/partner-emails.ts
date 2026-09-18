// lib/email/partner-emails.ts
//
// Mirrors lib/email/submission-emails.ts: swallow errors, log on failure,
// never block the API response. Called from the two Partner API routes
// after a successful save.

import type {
  PartnerApplicantPayload,
  PartnerAmbassadorPayload,
} from "@/lib/submissions/partner-types";
import { getEmailConfig, sendResendEmailSafely, MARK_ATTACHMENT } from "./resend";
import {
  renderPartnerApplicantInternal,
  renderPartnerApplicantConfirmation,
  renderPartnerAmbassadorInternal,
  renderPartnerAmbassadorConfirmation,
} from "./partner-templates";

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

  await sendResendEmailSafely(
    {
      to: [to],
      subject: `New Partner applicant (${qualified ? "qualified" : "unqualified"}) — ${fullName}`,
      html: renderPartnerApplicantInternal(payload, { qualified, reasons }),
      attachments: [MARK_ATTACHMENT],
    },
    "partner applicant internal",
  );

  if (!payload.email) return;

  await sendResendEmailSafely(
    {
      to: [payload.email],
      subject: qualified
        ? "You're in — Partner"
        : "We've got your application — Partner",
      html: renderPartnerApplicantConfirmation(payload, { qualified }),
      attachments: [MARK_ATTACHMENT],
    },
    "partner applicant confirmation",
  );
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

  await sendResendEmailSafely(
    {
      to: [to],
      subject: `New Partner ambassador — ${payload.name}`,
      html: renderPartnerAmbassadorInternal(payload, { code }),
      attachments: [MARK_ATTACHMENT],
    },
    "partner ambassador internal",
  );

  await sendResendEmailSafely(
    {
      to: [payload.email],
      subject: "You're a Partner ambassador — here's your link",
      html: renderPartnerAmbassadorConfirmation(payload, { code, referralUrl }),
      attachments: [MARK_ATTACHMENT],
    },
    "partner ambassador confirmation",
  );
}