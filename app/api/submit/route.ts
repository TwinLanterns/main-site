import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

type StudentPayload = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  level?: string;
  school?: string;
  gradYear?: string;
  location?: string;
  interests?: string[];
  hours?: string;
  startWeeks?: string;
  setup?: string;
  priorities?: string[];
  built?: string;
  links?: string;
};

type CompanyPayload = {
  company?: string;
  website?: string;
  name?: string;
  email?: string;
  stage?: string;
  team?: string;
  fn?: string;
  title?: string;
  outcome?: string;
  setup?: string;
  city?: string;
  commitment?: string;
  pay?: string;
  timeline?: string;
};

/**
 * Receives student applications and company briefs.
 *
 * Each is written to its own readable table in Supabase (student_applications
 * / company_briefs) with named columns, plus the raw payload as a jsonb
 * backup. If RESEND_API_KEY and TL_NOTIFY_EMAIL are also set, a notification
 * email is sent on top of that, but a missing or failing email never blocks
 * the submission from being saved.
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
  if (kind !== "student" && kind !== "company") {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseServerClient();

    if (kind === "student") {
      const p = payload as StudentPayload;
      const { error: dbError } = await supabase
        .from("student_applications")
        .insert({
          first_name: p.firstName ?? "",
          last_name: p.lastName ?? null,
          email: p.email ?? "",
          phone: p.phone ?? null,
          level: p.level ?? null,
          school: p.school ?? null,
          grad_year: p.gradYear ?? null,
          location: p.location ?? null,
          interests: p.interests ?? [],
          hours_per_week: p.hours ?? null,
          start_timing: p.startWeeks ?? null,
          work_setup: p.setup ?? null,
          priorities: p.priorities ?? [],
          built: p.built ?? null,
          links: p.links ?? null,
          resume_name: attachment?.name ?? null,
          resume_data: attachment?.data ?? null,
          raw_payload: payload,
        });
      if (dbError) {
        console.error("supabase insert error (student_applications)", dbError);
        return NextResponse.json({ error: "Save failed" }, { status: 502 });
      }
    } else {
      const p = payload as CompanyPayload;
      const { error: dbError } = await supabase.from("company_briefs").insert({
        company: p.company ?? "",
        website: p.website ?? null,
        contact_name: p.name ?? "",
        contact_email: p.email ?? "",
        stage: p.stage ?? null,
        team_size: p.team ?? null,
        function: p.fn ?? null,
        title: p.title ?? null,
        outcome: p.outcome ?? null,
        work_setup: p.setup ?? null,
        city: p.city ?? null,
        commitment: p.commitment ?? null,
        pay: p.pay ?? null,
        timeline: p.timeline ?? null,
        raw_payload: payload,
      });
      if (dbError) {
        console.error("supabase insert error (company_briefs)", dbError);
        return NextResponse.json({ error: "Save failed" }, { status: 502 });
      }
    }
  } catch (err) {
    console.error("supabase config error", err);
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 },
    );
  }

  const key = process.env.RESEND_API_KEY;
  const to = process.env.TL_NOTIFY_EMAIL;
  const from =
    process.env.TL_FROM_EMAIL ?? "Twin Lanterns <onboarding@resend.dev>";

  async function sendEmail(args: {
    to: string[];
    subject: string;
    html: string;
    withAttachment?: boolean;
  }) {
    const attachmentsList: any[] = [
      {
        path: "https://twinlanterns.co",
        filename: "mark.svg",
        contentId: "mark",
      },
    ];
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
        ...(args.withAttachment && attachment?.data
          ? {
              attachments: [
                { filename: attachment.name, content: attachment.data },
              ],
            }
          : {}),
      }),
    });
    if (!res.ok) {
      console.error("resend error", args.to, await res.text());
    }
  }

  if (key && to) {
    const rows = Object.entries(payload)
      .map(
        ([k, v]) =>
          `<tr><td style="padding:6px 14px 6px 0;color:#6b665c;font-size:12px;text-transform:uppercase;letter-spacing:.08em;vertical-align:top">${k}</td><td style="padding:6px 0;font-size:14px;color:#12110f">${
            Array.isArray(v) ? v.join(", ") : String(v ?? "—")
          }</td></tr>`,
      )
      .join("");

    // Internal notification to the founders.
    try {
      await sendEmail({
        to: [to],
        subject:
          kind === "student"
            ? `New student application — ${payload.firstName ?? ""} ${payload.lastName ?? ""}`
            : `New role brief — ${payload.company ?? ""}`,
        html: `<div style="font-family:ui-sans-serif,system-ui,sans-serif"><h2 style="font-weight:400">${
          kind === "student" ? "Student application" : "Company brief"
        }</h2><table>${rows}</table></div>`,
        withAttachment: true,
      });
    } catch (err) {
      console.error("resend request failed (internal notify)", err);
    }

    // Confirmation back to whoever submitted the form.
    const submitterEmail =
      typeof payload.email === "string" ? payload.email.trim() : "";
    if (submitterEmail) {
      const firstName =
        kind === "student"
          ? String(payload.firstName ?? "")
          : String(payload.name ?? "");
      const greeting = firstName ? `Hi ${firstName},` : "Hi there,";
      const bodyText =
        kind === "student"
          ? "Thanks for applying to Twin Lanterns. We review every application ourselves — if there's a role that fits, you'll hear from us, and if there isn't one today, you stay in the pool for the next one."
          : `Thanks for the brief on the role at ${payload.company ?? "your company"}. We'll confirm by email today and get a 30-minute intake call on the calendar. Your first shortlist lands 48 hours after that call.`;

      try {
        await sendEmail({
          to: [submitterEmail],
          subject:
            kind === "student"
              ? "We've got your application — Twin Lanterns"
              : "We've got your brief — Twin Lanterns",
          html: `<div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:480px"><p>${greeting}</p><p>${bodyText}</p><p>— Twin Lanterns</p></div>`,
        });
      } catch (err) {
        console.error("resend request failed (confirmation)", err);
      }
    }
  } else {
    console.log(
      `[twin-lanterns] ${kind} submission saved to Supabase (no email configured)`,
    );
  }

  return NextResponse.json({ ok: true });
}
