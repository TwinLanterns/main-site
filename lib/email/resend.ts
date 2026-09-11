export type ResendAttachment = {
  filename: string;
  content?: string;
  path?: string;
  content_id?: string;
  content_type?: string;
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