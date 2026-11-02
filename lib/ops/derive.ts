// lib/ops/derive.ts
//
// Views over workspace rows that several pages (and /demo) share. One
// canonical status per thing: these derive tab membership and totals from
// the stored stages instead of storing copies.

import type { ForecastInput } from "./forecast";
import { CLOSED_LEAD_STAGES, type LeadStage } from "./stages";

export type CrmTab = "potential" | "onboarding" | "current" | "unconfirmed" | "closed";

export interface TabEnrollment {
  lead_stage: string;
  collection_stage: string;
  record_status: string;
  readiness_confirmed_at: string | null;
}

/**
 * Current = readiness/activation confirmed by a manager, or a confirmed
 * record already in a collection stage. Imported rows nobody has
 * confirmed sit in their own tab and never count as current.
 */
export function crmTab(e: TabEnrollment): CrmTab {
  if (CLOSED_LEAD_STAGES.includes(e.lead_stage as LeadStage) || e.collection_stage === "withdrawn") return "closed";
  if (e.record_status !== "confirmed") return "unconfirmed";
  if (e.readiness_confirmed_at || ["recording", "paused", "completed"].includes(e.collection_stage)) return "current";
  if (["ready_for_onboarding", "onboarding", "activated"].includes(e.lead_stage)) return "onboarding";
  return "potential";
}

export interface ProdRow {
  enrollment_id: string | null;
  source_operator_id: string;
  calendar_date: string;
  submitted_seconds: number | null;
  accepted_seconds: number | null;
  commit_quantity: number | null;
}

export function productionFor<R extends ProdRow>(enrollment: { id: string; source_operator_id: string | null }, rows: R[]): R[] {
  return rows.filter((r) => r.enrollment_id === enrollment.id || (enrollment.source_operator_id !== null && r.source_operator_id === enrollment.source_operator_id));
}

export function sumSeconds(rows: ProdRow[], key: "submitted_seconds" | "accepted_seconds") {
  const known = rows.filter((r) => r[key] !== null);
  return { seconds: known.reduce((s, r) => s + (r[key] ?? 0), 0), known: known.length };
}

export interface ForecastEnrollment extends TabEnrollment {
  id: string;
  anonymous_code: string;
  source_operator_id: string | null;
  target_seconds: number | null;
}

export interface ForecastAssumptionRow {
  enrollment_id: string;
  horizon_start: string;
  horizon_end: string;
  daily_seconds: number;
  remaining_recording_days: number;
  assumed_acceptance_rate: number | null;
  assumption_source: string;
}

export function forecastInputs(enrollments: ForecastEnrollment[], production: ProdRow[], assumptions: ForecastAssumptionRow[]): ForecastInput[] {
  const byId = new Map(assumptions.map((a) => [a.enrollment_id, a]));
  return enrollments
    .filter((e) => crmTab(e) !== "closed" || e.collection_stage === "withdrawn")
    .map((e) => {
      const a = byId.get(e.id);
      return {
        enrollmentId: e.id,
        code: e.anonymous_code,
        collectionStage: e.collection_stage,
        activated: crmTab(e) === "current",
        recordedToDateSeconds: sumSeconds(productionFor(e, production), "submitted_seconds").seconds,
        targetSeconds: e.target_seconds,
        dailySeconds: a?.daily_seconds ?? null,
        remainingDays: a?.remaining_recording_days ?? null,
        acceptanceRate: a?.assumed_acceptance_rate ?? null,
        assumptionSource: a?.assumption_source ?? "",
        horizon: a ? { start: a.horizon_start, end: a.horizon_end } : null,
      };
    });
}
