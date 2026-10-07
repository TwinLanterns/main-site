// lib/email/earn-emails.ts
//
// Mirrors lib/email/submission-emails.ts: swallow errors, log on failure,
// never block the API response. Called from the two Earn API routes
// after a successful save.

import type {
  EarnApplicantPayload,
  EarnAmbassadorPayload,
  EarnGoproPayload,
  EarnSpeechPayload,
} from "@/lib/submissions/earn-types";
import { getEmailConfig, sendResendEmailSafely, MARK_ATTACHMENT } from "./resend";
import {
  renderEarnApplicantInternal,
  renderEarnApplicantConfirmation,
  renderEarnGoproInternal,
  renderEarnGoproConfirmation,
  renderEarnSpeechInternal,
  renderEarnSpeechConfirmation,
  renderEarnAmbassadorInternal,
  renderEarnAmbassadorConfirmation,
} from "./earn-templates";

export async function sendEarnApplicantEmails(input: {
  payload: EarnApplicantPayload;
  qualified: boolean;
  reasons: string[];
}): Promise<void> {
  const { configured, to } = getEmailConfig();
  const { payload, qualified, reasons } = input;

  if (!configured || !to) {
    console.log(
      `[earn] applicant saved (${qualified ? "qualified" : "unqualified"}) — no email configured`,
    );
    return;
  }

  const fullName = [payload.firstName, payload.lastName]
    .filter(Boolean)
    .join(" ");

  await sendResendEmailSafely(
    {
      to: [to],
      subject: `New Earn applicant (${qualified ? "qualified" : "unqualified"}) — ${fullName}`,
      html: renderEarnApplicantInternal(payload, { qualified, reasons }),
      attachments: [MARK_ATTACHMENT],
    },
    "earn applicant internal",
  );

  if (!payload.email) return;

  await sendResendEmailSafely(
    {
      to: [payload.email],
      subject: qualified
        ? "You're in — Earn"
        : "We've got your application — Earn",
      html: renderEarnApplicantConfirmation(payload, { qualified }),
      attachments: [MARK_ATTACHMENT],
    },
    "earn applicant confirmation",
  );
}

export async function sendEarnGoproEmails(input: {
  payload: EarnGoproPayload;
  qualified: boolean;
  reasons: string[];
}): Promise<void> {
  const { configured, to } = getEmailConfig();
  const { payload, qualified, reasons } = input;

  if (!configured || !to) {
    console.log(
      `[earn] gopro applicant saved (${qualified ? "qualified" : "unqualified"}) — no email configured`,
    );
    return;
  }

  const fullName = [payload.firstName, payload.lastName]
    .filter(Boolean)
    .join(" ");

  await sendResendEmailSafely(
    {
      to: [to],
      subject: `New Earn GoPro sign-up (${qualified ? "qualified" : "unqualified"}) — ${fullName}`,
      html: renderEarnGoproInternal(payload, { qualified, reasons }),
      attachments: [MARK_ATTACHMENT],
    },
    "earn gopro internal",
  );

  if (!payload.email) return;

  await sendResendEmailSafely(
    {
      to: [payload.email],
      subject: qualified
        ? "You're on the list — Earn GoPro"
        : "We've got your sign-up — Earn GoPro",
      html: renderEarnGoproConfirmation(payload, { qualified }),
      attachments: [MARK_ATTACHMENT],
    },
    "earn gopro confirmation",
  );
}

export async function sendEarnSpeechEmails(input: {
  payload: EarnSpeechPayload;
  qualified: boolean;
  reasons: string[];
}): Promise<void> {
  const { configured, to } = getEmailConfig();
  const { payload, qualified, reasons } = input;

  if (!configured || !to) {
    console.log(
      `[earn] speech participant saved (${qualified ? "qualified" : "unqualified"}) — no email configured`,
    );
    return;
  }

  const fullName = [payload.firstName, payload.lastName]
    .filter(Boolean)
    .join(" ");

  await sendResendEmailSafely(
    {
      to: [to],
      subject: `New Earn speech sign-up (${qualified ? "qualified" : "unqualified"}) — ${fullName}`,
      html: renderEarnSpeechInternal(payload, { qualified, reasons }),
      attachments: [MARK_ATTACHMENT],
    },
    "earn speech internal",
  );

  if (!payload.email) return;

  await sendResendEmailSafely(
    {
      to: [payload.email],
      subject: qualified
        ? "You're on the list — Earn speech program"
        : "We've got your sign-up — Earn speech program",
      html: renderEarnSpeechConfirmation(payload, { qualified }),
      attachments: [MARK_ATTACHMENT],
    },
    "earn speech confirmation",
  );
}

export async function sendEarnAmbassadorEmails(input: {
  payload: EarnAmbassadorPayload;
  code: string;
  referralUrl: string;
}): Promise<void> {
  const { configured, to } = getEmailConfig();
  const { payload, code, referralUrl } = input;

  if (!configured || !to) {
    console.log(
      `[earn] ambassador saved — code ${code} — no email configured`,
    );
    return;
  }

  await sendResendEmailSafely(
    {
      to: [to],
      subject: `New Earn ambassador — ${payload.name}`,
      html: renderEarnAmbassadorInternal(payload, { code }),
      attachments: [MARK_ATTACHMENT],
    },
    "earn ambassador internal",
  );

  await sendResendEmailSafely(
    {
      to: [payload.email],
      subject: "You're a Earn ambassador — here's your link",
      html: renderEarnAmbassadorConfirmation(payload, { code, referralUrl }),
      attachments: [MARK_ATTACHMENT],
    },
    "earn ambassador confirmation",
  );
}