// lib/email/partner-templates.ts
//
// Partner-specific email bodies. Reuses the Twin Lanterns shell from
// templates.ts so the two verticals stay visually consistent, but with
// Partner copy and a Partner footer.

import type {
  PartnerApplicantPayload,
  PartnerAmbassadorPayload,
  PartnerGoproPayload,
} from "@/lib/submissions/partner-types";
import {
  COLOR,
  shell,
  brandHeader,
  title,
  escapeHtml,
  pill,
  renderKeyValueTable as rows,
} from "./templates";

const PARTNER_FOOTER = `Partner · Twin Lanterns  · Real-world task data.<br />
<a href="https://twinlanterns.co/partner" style="color:${COLOR.muted};text-decoration:underline">twinlanterns.co/partner</a>`;

function deviceLabel(os: PartnerApplicantPayload["deviceOs"]): string {
  if (os === "ios") return "iOS";
  if (os === "android") return "Android";
  return "";
}

// ---------- Applicant ----------

export function renderPartnerApplicantInternal(
  payload: PartnerApplicantPayload,
  status: { qualified: boolean; reasons: string[] },
): string {
  const fullName = [payload.firstName, payload.lastName]
    .filter(Boolean)
    .join(" ");

  const device = [deviceLabel(payload.deviceOs), payload.deviceModel]
    .filter(Boolean)
    .join(" · ");

  const items: [string, string][] = [
    ["Name", fullName],
    ["Email", payload.email],
    ["Phone", payload.phone ?? ""],
    ["Location", payload.location ?? ""],
    ["Device", device],
    ["Filming head-mounted", payload.filmingAck ? "Yes" : "No"],
    ["Consent to be filmed", payload.consent ? "Yes" : "No"],
    ["Task interests", payload.taskInterests.join(", ")],
    ["Referred by", payload.referredByCode ?? ""],
    [
      "Qualified",
      status.qualified
        ? "Yes"
        : `No — ${status.reasons.join(", ") || "unknown"}`,
    ],
  ];

  const heading = status.qualified
    ? "New Partner applicant — qualified"
    : "New Partner applicant — unqualified";

  const inner = `
    ${brandHeader()}
    ${pill(status.qualified ? "Qualified" : "Unqualified")}
    ${title(heading)}
    ${rows(items)}
  `;

  return shell(inner, { preheader: heading, footer: PARTNER_FOOTER });
}

export function renderPartnerApplicantConfirmation(
  payload: PartnerApplicantPayload,
  status: { qualified: boolean },
): string {
  const firstName = payload.firstName?.trim() || "there";

  const heading = status.qualified
    ? `You're in, ${firstName}.`
    : `Thanks for applying, ${firstName}.`;

  const body = status.qualified
    ? "We've reviewed your application and you're a fit for Twin Lanterns. We'll email you the next steps for recording your first task within a couple of days."
    : "Thanks for applying to Twin Lanterns. Your device or setup doesn't match what we need for this round — but we keep every application on file and will reach out if that changes.";

  const inner = `
    ${brandHeader()}
    ${title(escapeHtml(heading))}
    <p style="margin:0;font-size:15px;line-height:1.6;color:${COLOR.ink}">${escapeHtml(
      body,
    )}</p>
    <p style="margin:26px 0 0;font-size:15px;line-height:1.6;color:${COLOR.muted}">— Twin Lanterns</p>
  `;

  return shell(inner, {
    preheader: status.qualified
      ? "You're in — here's what happens next."
      : "We got your application — here's what happens next.",
    footer: PARTNER_FOOTER,
  });
}

// ---------- GoPro applicant ----------

const yn = (v: boolean) => (v ? "Yes" : "No");

export function renderPartnerGoproInternal(
  payload: PartnerGoproPayload,
  status: { qualified: boolean; reasons: string[] },
): string {
  const fullName = [payload.firstName, payload.lastName]
    .filter(Boolean)
    .join(" ");

  const items: [string, string][] = [
    ["Name", fullName],
    ["Email", payload.email],
    ["Phone", payload.phone ?? ""],
    ["Location", payload.location ?? ""],
    ["18 or older", yn(payload.isAdult)],
    ["Has all five core areas", yn(payload.hasCoreAreas)],
    ["Can keep others out of frame", yn(payload.canKeepOthersOut)],
    ["5+ hrs/week", yn(payload.weeklyHoursOk)],
    ["Consent to home recording", yn(payload.consent)],
    ["Referred by", payload.referredByCode ?? ""],
    [
      "Qualified",
      status.qualified
        ? "Yes"
        : `No — ${status.reasons.join(", ") || "unknown"}`,
    ],
  ];

  const heading = status.qualified
    ? "New GoPro sign-up — qualified"
    : "New GoPro sign-up — unqualified";

  const inner = `
    ${brandHeader()}
    ${pill(status.qualified ? "Qualified" : "Unqualified")}
    ${title(heading)}
    ${rows(items)}
  `;

  return shell(inner, { preheader: heading, footer: PARTNER_FOOTER });
}

export function renderPartnerGoproConfirmation(
  payload: PartnerGoproPayload,
  status: { qualified: boolean },
): string {
  const firstName = payload.firstName?.trim() || "there";

  const heading = status.qualified
    ? `You're on the list, ${firstName}.`
    : `Thanks for signing up, ${firstName}.`;

  const body = status.qualified
    ? "Thanks for signing up for the Partner GoPro home program. Your home looks like a fit — we'll email you next steps, including equipment and scheduling, within a couple of days."
    : "Thanks for signing up for the Partner GoPro home program. Your home or availability doesn't match what we need for this round — but we keep every sign-up on file and will reach out if that changes.";

  const inner = `
    ${brandHeader()}
    ${title(escapeHtml(heading))}
    <p style="margin:0;font-size:15px;line-height:1.6;color:${COLOR.ink}">${escapeHtml(
      body,
    )}</p>
    <p style="margin:26px 0 0;font-size:15px;line-height:1.6;color:${COLOR.muted}">— Twin Lanterns</p>
  `;

  return shell(inner, {
    preheader: status.qualified
      ? "You're on the list — here's what happens next."
      : "We got your sign-up — here's what happens next.",
    footer: PARTNER_FOOTER,
  });
}

// ---------- Ambassador ----------

export function renderPartnerAmbassadorInternal(
  payload: PartnerAmbassadorPayload,
  meta: { code: string },
): string {
  const items: [string, string][] = [
    ["Name", payload.name],
    ["Email", payload.email],
    ["Referral code", meta.code],
  ];

  const inner = `
    ${brandHeader()}
    ${pill("New ambassador")}
    ${title("Ambassador signup")}
    ${rows(items)}
  `;

  return shell(inner, {
    preheader: `${payload.name} just signed up as a ambassador.`,
    footer: PARTNER_FOOTER,
  });
}

export function renderPartnerAmbassadorConfirmation(
  payload: PartnerAmbassadorPayload,
  meta: { code: string; referralUrl: string },
): string {
  const firstName = payload.name.trim().split(/\s+/)[0] || "there";

  const inner = `
    ${brandHeader()}
    ${pill("Twin Lantern ambassadors")}
    ${title(`You're an ambassador, ${escapeHtml(firstName)}.`)}
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${COLOR.ink}">
      Share this link with anyone you think would be a good fit. Every qualified applicant who completes their first task is credited to you.
    </p>
    <p style="margin:0 0 8px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${COLOR.muted}">Your link</p>
    <p style="margin:0;padding:14px 16px;background:${COLOR.shell};border:1px solid ${COLOR.line};border-radius:12px;font-size:14px;line-height:1.5;color:${COLOR.ink};word-break:break-all">
      <a href="${escapeHtml(
        meta.referralUrl,
      )}" style="color:${COLOR.flame};text-decoration:underline">${escapeHtml(
        meta.referralUrl,
      )}</a>
    </p>
    <p style="margin:18px 0 0;font-size:14px;line-height:1.6;color:${COLOR.muted}">Or share the code directly: <strong style="color:${COLOR.ink}">${escapeHtml(
      meta.code,
    )}</strong></p>
    <p style="margin:26px 0 0;font-size:15px;line-height:1.6;color:${COLOR.muted}">— Twin Lanterns</p>
  `;

  return shell(inner, {
    preheader: "Here's your referral link — start sharing.",
    footer: PARTNER_FOOTER,
  });
}