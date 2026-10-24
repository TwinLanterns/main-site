export type ResendAttachment = {
  filename: string;
  content?: string;
  path?: string;
  content_id?: string;
  content_type?: string;
};

// The Twin Lanterns mark, inlined via cid so it renders in every email
// template regardless of vertical (submission-emails.ts, earn-emails.ts,
// verification-emails.ts).
export const MARK_ATTACHMENT: ResendAttachment = {
  filename: "icon.png",
  path: "https://twinlanterns.co/icon.png",
  content_id: "mark",
  content_type: "image/png",
};

// Internal notifications go here unless TL_NOTIFY_EMAIL overrides it, so a
// missing env var can never silently swallow every founder notification.
const DEFAULT_NOTIFY_EMAIL = "twin.lanterns.business@gmail.com";

export function getEmailConfig() {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.TL_NOTIFY_EMAIL?.trim() || DEFAULT_NOTIFY_EMAIL;
  const from =
    process.env.TL_FROM_EMAIL ?? "Twin Lanterns <onboarding@resend.dev>";

  // Resend's shared sandbox sender only delivers to the account owner, so
  // in production it silently drops every applicant-facing email.
  if (
    process.env.NODE_ENV === "production" &&
    !process.env.TL_FROM_EMAIL
  ) {
    console.error(
      "TL_FROM_EMAIL is not set — falling back to onboarding@resend.dev, which only delivers to the Resend account owner.",
    );
  }

  return {
    key,
    to,
    from,
    configured: Boolean(key),
  };
}

export async function sendResendEmail(args: {
  to: string[];
  subject: string;
  html: string;
  attachments?: ResendAttachment[];
  /** Where replies go, e.g. the requester on an internal notification. */
  replyTo?: string;
}): Promise<void> {
  const { key, from } = getEmailConfig();

  if (!key) {
    throw new Error("resend not configured: RESEND_API_KEY is missing");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: args.to,
      subject: args.subject,
      html: args.html,
      attachments: args.attachments ?? [],
      ...(args.replyTo ? { reply_to: args.replyTo } : {}),
    }),
  });

  // Throw so callers that depend on delivery (verification codes) can
  // surface the failure; best-effort callers use sendResendEmailSafely.
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("resend error", args.to, body);
    throw new Error(`Resend responded ${res.status}`);
  }
}

// Best-effort send used by every notification/confirmation email — logs and
// swallows so a failed send never blocks the caller (the record is already
// saved by the time these run). lib/email/verification-emails.ts is the one
// exception: a failed code send IS the whole point, so it calls
// sendResendEmail directly and lets the error propagate.
export async function sendResendEmailSafely(
  args: Parameters<typeof sendResendEmail>[0],
  logLabel: string,
): Promise<void> {
  try {
    await sendResendEmail(args);
  } catch (err) {
    console.error(`resend request failed (${logLabel})`, err);
  }
}