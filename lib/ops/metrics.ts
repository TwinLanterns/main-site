// lib/ops/metrics.ts
//
// Overview cards, computed from records only. Each card states its
// definition and how complete the underlying data is. Unknown stays
// unknown: no card turns a missing value into zero.

import { formatHours } from "./duration";
import { NO_RECENT_UPLOAD_DAYS, OFFBOARD_REVIEW_DAYS } from "./stages";

export interface MetricEnrollment {
  id: string;
  anonymous_code: string;
  source_operator_id: string | null;
  collection_stage: string;
  record_status: string;
  readiness_confirmed_at: string | null;
}

export interface MetricProduction {
  source_operator_id: string;
  calendar_date: string;
  commit_quantity: number | null;
  submitted_seconds: number | null;
  accepted_seconds: number | null;
}

export interface MetricSession {
  state: string;
  duration_seconds: number | null;
  upload_status: string;
  review_status: string;
  approved_duration_seconds: number | null;
}

export interface Card {
  key: string;
  label: string;
  value: string;
  unknown: boolean;
  definition: string;
  completeness: string;
  estimate?: boolean;
}

export function overviewCards(input: {
  enrollments: MetricEnrollment[];
  production: MetricProduction[];
  sessions: MetricSession[];
  openIssues: number;
  openTasksOverdue: number;
  forecastRemainingSeconds: number | null;
  forecastIncluded: number;
  period: string;
}): Card[] {
  const { enrollments, production, sessions, period } = input;

  const recording = enrollments.filter((e) => e.collection_stage === "recording");
  const unconfirmedRecording = recording.filter((e) => e.record_status !== "confirmed").length;

  const completed = sessions.filter((s) => s.state === "completed");
  const withDuration = completed.filter((s) => s.duration_seconds !== null);
  const sessionSeconds = withDuration.reduce((s, x) => s + (x.duration_seconds ?? 0), 0);

  const submittedCells = production.filter((p) => p.submitted_seconds !== null);
  const submittedSeconds = submittedCells.reduce((s, p) => s + (p.submitted_seconds ?? 0), 0);

  const acceptedCells = production.filter((p) => p.accepted_seconds !== null);
  const acceptedSeconds = acceptedCells.reduce((s, p) => s + (p.accepted_seconds ?? 0), 0);
  const customerSessions = sessions.filter(
    (s) => ["customer_accepted", "partial"].includes(s.review_status) && s.approved_duration_seconds !== null,
  );
  const approvedSessionSeconds = customerSessions.reduce((s, x) => s + (x.approved_duration_seconds ?? 0), 0);
  const anyAccepted = acceptedCells.length + customerSessions.length > 0;

  return [
    {
      key: "active",
      label: "Active recording operators",
      value: String(recording.length),
      unknown: false,
      definition: "Operators whose collection stage is explicitly set to Recording. Leads and onboarding operators are not counted.",
      completeness:
        unconfirmedRecording > 0
          ? `${unconfirmedRecording} of these came from a workbook row not yet confirmed as an eligible person.`
          : "Current stage, not a historical count.",
    },
    {
      key: "recorded",
      label: "Recorded (tracked sessions)",
      value: withDuration.length ? formatHours(sessionSeconds) : "No sessions yet",
      unknown: withDuration.length === 0,
      definition: "Sum of duration on completed sessions logged in Recording Operations. Each session counts once, however many files it has.",
      completeness: `${withDuration.length} of ${completed.length} completed sessions have a duration · ${period}`,
    },
    {
      key: "submitted",
      label: "Submitted (workbook)",
      value: submittedCells.length ? formatHours(submittedSeconds) : "No import yet",
      unknown: submittedCells.length === 0,
      definition: "Submitted duration from the weekly production workbook's operator-day cells, recomputed from rows (the sheet's own printed totals are not used). Daily aggregates, not sessions — not added to the session total.",
      completeness: `${submittedCells.length} operator-days with a submitted value · ${period}`,
    },
    {
      key: "accepted",
      label: "Customer-accepted",
      value: anyAccepted ? formatHours(acceptedSeconds + approvedSessionSeconds) : "Not yet available",
      unknown: !anyAccepted,
      definition: "Duration explicitly recorded as accepted by the customer, with a cited source. Blank Accepted cells are unknown, not zero. Rejected time is never inferred by subtraction.",
      completeness: anyAccepted
        ? `${acceptedCells.length} of ${submittedCells.length} submitted operator-days have an Accepted value · ${period}`
        : "No acceptance decisions have been recorded.",
    },
    {
      key: "forecast",
      label: "Forecast remaining",
      value: input.forecastRemainingSeconds === null ? "No assumptions yet" : formatHours(input.forecastRemainingSeconds),
      unknown: input.forecastRemainingSeconds === null,
      estimate: true,
      definition: "Estimate. Modeled future recorded output for activated operators with documented daily rate and remaining days. See Production Forecasts.",
      completeness: `${input.forecastIncluded} operators with assumptions included`,
    },
    {
      key: "followups",
      label: "Open follow-ups",
      value: String(input.openIssues + input.openTasksOverdue),
      unknown: false,
      definition: "Unresolved issues plus open tasks past their due date.",
      completeness: `${input.openIssues} open issues · ${input.openTasksOverdue} overdue tasks`,
    },
  ];
}

export interface UploadAlert {
  sourceOperatorId: string;
  lastUploadDate: string | null;
  daysSince: number | null;
  level: "ok" | "no_recent_upload" | "offboarding_review_due" | "never";
}

function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

/**
 * Days since the last operator-day with submitted time, as of `asOf`.
 * Built from daily aggregates, so precision is one day. These are flags
 * for follow-up — nobody is offboarded automatically.
 */
export function uploadAlerts(production: MetricProduction[], operatorIds: string[], asOf: string): UploadAlert[] {
  const last = new Map<string, string>();
  for (const p of production) {
    if (!p.submitted_seconds || p.calendar_date > asOf) continue;
    const prev = last.get(p.source_operator_id);
    if (!prev || p.calendar_date > prev) last.set(p.source_operator_id, p.calendar_date);
  }
  return operatorIds.map((id) => {
    const d = last.get(id) ?? null;
    if (!d) return { sourceOperatorId: id, lastUploadDate: null, daysSince: null, level: "never" as const };
    const days = daysBetween(d, asOf);
    const level = days > OFFBOARD_REVIEW_DAYS ? "offboarding_review_due" : days > NO_RECENT_UPLOAD_DAYS ? "no_recent_upload" : "ok";
    return { sourceOperatorId: id, lastUploadDate: d, daysSince: days, level };
  });
}
