import type { Submission } from "@/lib/submissions/types";
import {
  getEmailConfig,
  sendResendEmail,
  type ResendAttachment,
} from "./resend";
import {
  renderConfirmation,
  renderInternalNotification,
} from "./templates";

const MARK_ATTACHMENT: ResendAttachment = {
  filename: "icon.png",
  path: "https://twinlanterns.co/icon.png",
  content_id: "mark",
  content_type: "image/png",
};

function getString(payload: Submission["payload"], key: string): string {
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "string" ? value.trim() : "";
}

export async function sendSubmissionEmails(
  submission: Submission,
): Promise<void> {
  const { configured, to } = getEmailConfig();

  if (!configured || !to) {
    console.log(
      `[twin-lanterns] ${submission.kind} submission saved to Supabase (no email configured)`,
    );
    return;
  }

  const { kind, payload, attachment } = submission;

  const internalAttachments: ResendAttachment[] = [MARK_ATTACHMENT];

  if (attachment?.data) {
    internalAttachments.push({
      filename: attachment.name,
      content: attachment.data,
    });
  }

  const internalSubject =
    kind === "student"
      ? `New student application — ${getString(payload, "firstName")} ${getString(
          payload,
          "lastName",
        )}`
      : `New role brief — ${getString(payload, "company")}`;

  try {
    await sendResendEmail({
      to: [to],
      subject: internalSubject,
      html: renderInternalNotification(kind, payload),
      attachments: internalAttachments,
    });
  } catch (err) {
    console.error("resend request failed (internal notify)", err);
  }

  const submitterEmail = getString(payload, "email");
  if (!submitterEmail) return;

  const confirmationSubject =
    kind === "student"
      ? "We've got your application — Twin Lanterns"
      : "We've got your brief — Twin Lanterns";

  try {
    await sendResendEmail({
      to: [submitterEmail],
      subject: confirmationSubject,
      html: renderConfirmation(kind, payload),
      attachments: [MARK_ATTACHMENT],
    });
  } catch (err) {
    console.error("resend request failed (confirmation)", err);
  }
}