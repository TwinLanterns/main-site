export type ResendAttachment = {
  filename: string;
  content?: string;
  path?: string;
  content_id?: string;
  content_type?: string;
};

// The Twin Lanterns mark, inlined via cid so it renders in every email
// template regardless of vertical (submission-emails.ts, partner-emails.ts,
// verification-emails.ts).
export const MARK_ATTACHMENT: ResendAttachment = {
  filename: "icon.png",
  path: "https://twinlanterns.co/icon.png",
  content_id: "mark",
  content_type: "image/png",
};

export function getEmailConfig() {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.TL_NOTIFY_EMAIL;
  const from =
    process.env.TL_FROM_EMAIL ?? "Twin Lanterns <onboarding@resend.dev>";

  return {
    key,
    to,
    from,
    configured: Boolean(key && to),
  };
}

export async function sendResendEmail(args: {
  to: string[];
  subject: string;
  html: string;
  attachments?: ResendAttachment[];
}): Promise<void> {
  const { key, from } = getEmailConfig();

  if (!key) return;

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
    }),
  });

  if (!res.ok) {
    console.error("resend error", args.to, await res.text());
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