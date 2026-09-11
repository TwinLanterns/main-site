import type { SubmissionKind, SubmissionPayload } from "@/lib/submissions/types";

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

function renderRows(payload: SubmissionPayload): string {
  return Object.entries(payload as Record<string, unknown>)
    .map(([key, value]) => {
      const display = Array.isArray(value)
        ? value.join(", ")
        : String(value ?? "—");

      return `<tr>
        <td style="padding:6px 14px 6px 0;color:#6b665c;font-size:12px;text-transform:uppercase;letter-spacing:.08em;vertical-align:top">${escapeHtml(
          key,
        )}</td>
        <td style="padding:6px 0;font-size:14px;color:#12110f">${escapeHtml(
          display,
        )}</td>
      </tr>`;
    })
    .join("");
}

export function renderInternalNotification(
  kind: SubmissionKind,
  payload: SubmissionPayload,
): string {
  return `<div style="font-family:ui-sans-serif,system-ui,sans-serif">
    <img src="cid:mark" alt="Twin Lanterns" width="32" height="32" style="display:block;margin-bottom:14px;border:0;outline:none;text-decoration:none" />
    <h2 style="font-weight:400">${
      kind === "student" ? "Student application" : "Company brief"
    }</h2>
    <table>${renderRows(payload)}</table>
  </div>`;
}

export function renderConfirmation(
  kind: SubmissionKind,
  payload: SubmissionPayload,
): string {
  const firstName =
    kind === "student"
      ? getString(payload, "firstName")
      : getString(payload, "name");

  const greeting = firstName
    ? `Hi ${escapeHtml(firstName)},`
    : "Hi there,";

  const bodyText =
    kind === "student"
      ? "Thanks for applying to Twin Lanterns. We review every application ourselves — if there's a role that fits, you'll hear from us, and if there isn't one today, you stay in the pool for the next one."
      : `Thanks for the brief on the role at ${escapeHtml(
          getString(payload, "company") || "your company",
        )}. We'll confirm by email today and get a 30-minute intake call on the calendar. Your first shortlist lands 48 hours after that call.`;

  return `<div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:480px">
    <img src="cid:mark" alt="Twin Lanterns" width="32" height="32" style="display:block;margin-bottom:16px;border:0;outline:none;text-decoration:none" />
    <p>${greeting}</p>
    <p>${bodyText}</p>
    <p>— Twin Lanterns</p>
  </div>`;
}