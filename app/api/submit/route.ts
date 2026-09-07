import { NextResponse } from "next/server";

/**
 * Receives student applications and company briefs.
 *
 * If RESEND_API_KEY and TL_NOTIFY_EMAIL are set the submission is emailed to
 * the founders; otherwise it is logged to the deployment's runtime logs so
 * nothing is silently lost while the mail provider is being set up.
 */
export async function POST(req: Request) {
  let body: {
    kind?: string;
    payload?: Record<string, unknown>;
    attachment?: { name: string; data: string } | null;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { kind, payload, attachment } = body;
  if (!kind || !payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const key = process.env.RESEND_API_KEY;
  const to = process.env.TL_NOTIFY_EMAIL;

  if (key && to) {
    const rows = Object.entries(payload)
      .map(
        ([k, v]) =>
          `<tr><td style="padding:6px 14px 6px 0;color:#6b665c;font-size:12px;text-transform:uppercase;letter-spacing:.08em;vertical-align:top">${k}</td><td style="padding:6px 0;font-size:14px;color:#12110f">${
            Array.isArray(v) ? v.join(", ") : String(v ?? "—")
          }</td></tr>`,
      )
      .join("");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.TL_FROM_EMAIL ?? "Twin Lanterns <onboarding@resend.dev>",
        to: [to],
        subject:
          kind === "student"
            ? `New student application — ${payload.firstName ?? ""} ${payload.lastName ?? ""}`
            : `New role brief — ${payload.company ?? ""}`,
        html: `<div style="font-family:ui-sans-serif,system-ui,sans-serif"><h2 style="font-weight:400">${
          kind === "student" ? "Student application" : "Company brief"
        }</h2><table>${rows}</table></div>`,
        ...(attachment?.data
          ? {
              attachments: [
                { filename: attachment.name, content: attachment.data },
              ],
            }
          : {}),
      }),
    });

    if (!res.ok) {
      console.error("resend error", await res.text());
      return NextResponse.json({ error: "Delivery failed" }, { status: 502 });
    }
  } else {
    console.log(`[twin-lanterns] ${kind} submission`, JSON.stringify(payload));
  }

  return NextResponse.json({ ok: true });
}
