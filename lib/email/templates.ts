import type { SubmissionKind, SubmissionPayload } from "@/lib/submissions/types";

// Brand palette — keep in sync with app/globals.css
export const COLOR = {
  ink: "#12110f",
  muted: "#6b665c",
  line: "#e8e3d9",
  shell: "#faf7f2",
  flame: "#ea5a2b",
  white: "#ffffff",
} as const;

export function escapeHtml(value: unknown): string {
  return String(value ?? "—")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getString(payload: SubmissionPayload, key: string): string {
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

function humanizeKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

// ---------- Shared shell ----------

export function shell(
  inner: string,
  opts: { preheader?: string; footer?: string } = {},
): string {
  const preheader = opts.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${COLOR.shell}">${escapeHtml(
        opts.preheader,
      )}</div>`
    : "";

  const footer =
    opts.footer ??
    `Twin Lanterns · Student talent, matched by hand.<br />
     <a href="https://twinlanterns.co" style="color:${COLOR.muted};text-decoration:underline">twinlanterns.co</a>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>Twin Lanterns</title>
</head>
<body style="margin:0;padding:0;background:${COLOR.shell};font-family:'DM Sans',ui-sans-serif,system-ui,-apple-system,sans-serif;color:${COLOR.ink}">
  ${preheader}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLOR.shell};padding:32px 16px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:${COLOR.white};border:1px solid ${COLOR.line};border-radius:20px;overflow:hidden">
          <tr>
            <td style="padding:36px 36px 28px">${inner}</td>
          </tr>
          <tr>
            <td style="padding:18px 36px 24px;border-top:1px solid ${COLOR.line};font-size:12px;line-height:1.5;color:${COLOR.muted}">
              ${footer}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function brandHeader(): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px">
    <tr>
      <td style="vertical-align:middle;padding-right:10px">
        <img src="cid:mark" alt="" width="28" height="28" style="display:block;border:0;outline:none;text-decoration:none" />
      </td>
      <td style="vertical-align:middle;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:${COLOR.muted}">Twin Lanterns</td>
    </tr>
  </table>`;
}

// Shared with lib/email/earn-templates.ts, which reuses this for its own
// status pills (Qualified/Unqualified, New ambassador, …).
export function pill(label: string): string {
  return `<span style="display:inline-block;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${COLOR.flame};background:${COLOR.shell};border:1px solid ${COLOR.line};border-radius:999px;padding:4px 10px">${escapeHtml(label)}</span>`;
}

function kindPill(kind: SubmissionKind): string {
  return pill(kind === "student" ? "Student application" : "Company brief");
}

export function title(text: string): string {
  return `<h1 style="margin:14px 0 22px;font-size:24px;line-height:1.25;font-weight:500;letter-spacing:-0.01em;color:${COLOR.ink}">${text}</h1>`;
}

// ---------- Verification code ----------

export function renderVerificationCode(code: string): string {
  const inner = `
    ${brandHeader()}
    ${title("Confirm your email")}
    <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:${COLOR.ink}">Enter this code to confirm it's really you:</p>
    <p style="margin:0 0 22px;font-size:32px;font-weight:600;letter-spacing:0.3em;color:${COLOR.ink}">${escapeHtml(code)}</p>
    <p style="margin:0;font-size:13px;line-height:1.6;color:${COLOR.muted}">This code expires in 10 minutes. If you didn't request it, you can ignore this email.</p>
  `;

  return shell(inner, { preheader: `Your verification code is ${code}.` });
}

// ---------- Payload table ----------

// Shared with lib/email/earn-templates.ts, which builds its own
// [label, value] pairs directly instead of deriving them from an object.
export function renderKeyValueTable(items: [string, string][]): string {
  const rows = items
    .map(([label, value], i) => {
      const borderTop = i === 0 ? "" : `border-top:1px solid ${COLOR.line};`;
      return `<tr>
        <td style="${borderTop}padding:12px 14px 12px 0;vertical-align:top;width:34%;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:${COLOR.muted}">${escapeHtml(
          label,
        )}</td>
        <td style="${borderTop}padding:12px 0;vertical-align:top;font-size:14px;line-height:1.5;color:${COLOR.ink};word-break:break-word">${escapeHtml(
          value,
        )}</td>
      </tr>`;
    })
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">${rows}</table>`;
}

function renderRows(payload: SubmissionPayload): string {
  const entries = Object.entries(payload as Record<string, unknown>);
  if (entries.length === 0) return "";

  return renderKeyValueTable(
    entries.map(([key, value]) => [humanizeKey(key), formatValue(value)]),
  );
}

// ---------- Public renderers ----------

export function renderInternalNotification(
  kind: SubmissionKind,
  payload: SubmissionPayload,
): string {
  const heading =
    kind === "student" ? "New student application" : "New company brief";

  const inner = `
    ${brandHeader()}
    ${kindPill(kind)}
    ${title(heading)}
    ${renderRows(payload)}
  `;

  return shell(inner, {
    preheader: `${heading} — new submission received.`,
  });
}

export function renderConfirmation(
  kind: SubmissionKind,
  payload: SubmissionPayload,
): string {
  const firstName =
    kind === "student"
      ? getString(payload, "firstName")
      : getString(payload, "name");

  const greeting = firstName ? `Hi ${escapeHtml(firstName)},` : "Hi there,";

  const heading =
    kind === "student" ? "Application received" : "Brief received";

  const bodyText =
    kind === "student"
      ? "Thanks for applying to Twin Lanterns. We review every application ourselves — if there's a role that fits, you'll hear from us, and if there isn't one today, you stay in the pool for the next one."
      : `Thanks for the brief on the role at ${escapeHtml(
          getString(payload, "company") || "your company",
        )}. We'll confirm by email today and get a 30-minute intake call on the calendar. Your first shortlist lands 48 hours after that call.`;

  const inner = `
    ${brandHeader()}
    ${title(heading)}
    <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${COLOR.ink}">${greeting}</p>
    <p style="margin:0;font-size:15px;line-height:1.6;color:${COLOR.ink}">${bodyText}</p>
    <p style="margin:26px 0 0;font-size:15px;line-height:1.6;color:${COLOR.muted}">— Twin Lanterns</p>
  `;

  return shell(inner, {
    preheader:
      kind === "student"
        ? "We got your application — here's what happens next."
        : "We got your brief — here's what happens next.",
  });
}