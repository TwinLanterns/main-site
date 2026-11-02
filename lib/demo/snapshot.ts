// lib/demo/snapshot.ts
//
// The ONLY data /demo can show. It is a separate, allowlisted dataset —
// /demo never queries Supabase or calls an /ops endpoint, so nothing private
// can leak through it.
//
// Every record below is SYNTHETIC: invented codes, durations and dates,
// shaped like the household pilot so the workflow can be shown. It is not
// company data and must never be described as such.
//
// To switch to a real sanitized snapshot: replace these records with an
// export Carlos has approved for this audience (anonymous codes, coarse
// locations, no names / phones / addresses / storage URLs / customer names),
// set DEMO_DATA_KIND to "approved_snapshot" and DEMO_SOURCE_DATE to the
// snapshot's as-of date, and get sign-off before publishing.

import type { TemplateStep } from "@/lib/ops/onboarding";
import { HOUSEHOLD_GUIDE_TEMPLATE } from "@/lib/ops/onboarding";

export const DEMO_DATA_KIND: "synthetic" | "approved_snapshot" = "synthetic";
export const DEMO_SOURCE_DATE = "2026-11-02";

export const demoProject = {
  code: "HH-PILOT",
  name: "Household collection pilot",
  customerAlias: "Egocentric data partner (alias)",
  stage: "Pilot",
  manager: "Project manager",
  location: "Households, US (coarse)",
};

export interface DemoOperator {
  id: string;
  anonymous_code: string;
  source_operator_id: string | null;
  lead_stage: string;
  collection_stage: string;
  record_status: string;
  readiness_confirmed_at: string | null;
  readiness_confirmed_label: string;
  lead_source: string;
  outreach_owner: string;
  onboarding_owner: string;
  next_action: string;
  target_seconds: number | null;
  location_category: string;
}

const h = (hours: number) => Math.round(hours * 3600);

export const demoOperators: DemoOperator[] = [
  { id: "d1", anonymous_code: "OP-101", source_operator_id: "SYN-01", lead_stage: "activated", collection_stage: "recording", record_status: "confirmed", readiness_confirmed_at: "2026-10-22T18:00:00Z", readiness_confirmed_label: "Project manager", lead_source: "Founder network", outreach_owner: "Founder", onboarding_owner: "Project manager", next_action: "Confirm Thursday shift", target_seconds: h(10), location_category: "Southern California" },
  { id: "d2", anonymous_code: "OP-102", source_operator_id: "SYN-02", lead_stage: "activated", collection_stage: "recording", record_status: "confirmed", readiness_confirmed_at: "2026-10-24T17:00:00Z", readiness_confirmed_label: "Project manager", lead_source: "Referral", outreach_owner: "Founder", onboarding_owner: "Project manager", next_action: "Check upload folder", target_seconds: null, location_category: "Southern California" },
  { id: "d3", anonymous_code: "OP-103", source_operator_id: null, lead_stage: "onboarding", collection_stage: "not_started", record_status: "confirmed", readiness_confirmed_at: null, readiness_confirmed_label: "", lead_source: "Campus channel", outreach_owner: "Project manager", onboarding_owner: "Project manager", next_action: "Re-run framing test", target_seconds: null, location_category: "Bay Area" },
  { id: "d4", anonymous_code: "OP-104", source_operator_id: null, lead_stage: "interested", collection_stage: "not_started", record_status: "confirmed", readiness_confirmed_at: null, readiness_confirmed_label: "", lead_source: "Founder network", outreach_owner: "Founder", onboarding_owner: "Project manager", next_action: "Qualification call", target_seconds: null, location_category: "Southern California" },
  { id: "d5", anonymous_code: "OP-105", source_operator_id: null, lead_stage: "outreach_pending", collection_stage: "not_started", record_status: "confirmed", readiness_confirmed_at: null, readiness_confirmed_label: "", lead_source: "Founder network", outreach_owner: "Founder", onboarding_owner: "", next_action: "First text", target_seconds: null, location_category: "—" },
  { id: "d6", anonymous_code: "OP-106", source_operator_id: null, lead_stage: "outreach_pending", collection_stage: "not_started", record_status: "confirmed", readiness_confirmed_at: null, readiness_confirmed_label: "", lead_source: "Founder network", outreach_owner: "Founder", onboarding_owner: "", next_action: "First text", target_seconds: null, location_category: "—" },
  { id: "d7", anonymous_code: "OP-107", source_operator_id: "SYN-07", lead_stage: "activated", collection_stage: "paused", record_status: "confirmed", readiness_confirmed_at: "2026-10-20T19:00:00Z", readiness_confirmed_label: "Project manager", lead_source: "Referral", outreach_owner: "Founder", onboarding_owner: "Project manager", next_action: "Resume after travel", target_seconds: null, location_category: "Inland Empire" },
];

/** Workbook-style operator-day aggregates (synthetic). */
export const demoProduction = [
  { enrollment_id: "d1", source_operator_id: "SYN-01", calendar_date: "2026-10-26", commit_quantity: 2, submitted_seconds: h(1.6), accepted_seconds: h(1.4) },
  { enrollment_id: "d1", source_operator_id: "SYN-01", calendar_date: "2026-10-28", commit_quantity: 2, submitted_seconds: h(2.1), accepted_seconds: null },
  { enrollment_id: "d1", source_operator_id: "SYN-01", calendar_date: "2026-10-31", commit_quantity: 2, submitted_seconds: h(1.8), accepted_seconds: null },
  { enrollment_id: "d2", source_operator_id: "SYN-02", calendar_date: "2026-10-27", commit_quantity: 1, submitted_seconds: h(0.9), accepted_seconds: null },
  { enrollment_id: "d2", source_operator_id: "SYN-02", calendar_date: "2026-10-28", commit_quantity: 1, submitted_seconds: h(1.2), accepted_seconds: null },
  { enrollment_id: "d7", source_operator_id: "SYN-07", calendar_date: "2026-10-23", commit_quantity: 1, submitted_seconds: h(1.0), accepted_seconds: null },
];

export const demoAssumptions = [
  { enrollment_id: "d1", horizon_start: "2026-11-03", horizon_end: "2026-11-16", daily_seconds: h(1.5), remaining_recording_days: 4, assumed_acceptance_rate: null, assumption_source: "Observed average, last week (synthetic)" },
  { enrollment_id: "d2", horizon_start: "2026-11-03", horizon_end: "2026-11-16", daily_seconds: h(1.0), remaining_recording_days: 6, assumed_acceptance_rate: null, assumption_source: "Operator-stated availability (synthetic)" },
  { enrollment_id: "d7", horizon_start: "2026-11-03", horizon_end: "2026-11-16", daily_seconds: h(1.0), remaining_recording_days: 3, assumed_acceptance_rate: null, assumption_source: "Plan before pause (synthetic)" },
];

export const demoTemplateSteps: TemplateStep[] = HOUSEHOLD_GUIDE_TEMPLATE.steps;

/** Completed / blocked steps per operator (synthetic). Absent = pending. */
export const demoSteps: Record<string, Record<string, { status: "completed" | "blocked" | "not_applicable"; reason?: string }>> = {
  d1: Object.fromEntries(HOUSEHOLD_GUIDE_TEMPLATE.steps.filter((s) => s.scope === "onboarding").map((s) => [s.key, { status: "completed" as const }])),
  d3: {
    eligibility: { status: "completed" },
    consent_status: { status: "completed" },
    instructions: { status: "completed" },
    training: { status: "completed" },
    equipment: { status: "completed" },
    power_sd: { status: "completed" },
    framing_test: { status: "blocked", reason: "Test clip cut off hands at counter height; re-mount and retest" },
  },
};

export const demoSession = {
  id: "s1",
  enrollment_id: "d1",
  when: "Fri Oct 31, 10:00 AM – 12:00 PM PT",
  fromShiftBoard: true,
  coordination: "Remote coordination",
  task: "laundry-to-basket",
  room: "kitchen",
  device: "Camera 1",
  checkin: "10:02 AM, manual entry by Project manager",
  checks: { qr_config: "completed", mounting: "completed", framing_check: "completed", pre_recording: "completed" } as Record<string, string>,
  state: "Completed",
  duration: "1:48:00 (measured)",
  upload: "Transfer reported",
  review: "Human review passed (internal)",
  customer: "Not yet available",
};

export const demoFiles = [
  "OP-101/10-31-2026/kitchen/laundry-to-basket-Static-01.mp4",
  "OP-101/10-31-2026/Living Room/Fold_Towels-static-3.MP4",
  "OP-101/10-31-2026/kitchen+dining_area/clear-table-Movement-1.mp4",
];

export const demoIssue = {
  category: "Naming",
  opened: "Oct 31 (synthetic)",
  description: "Second upload used a room name and capture mode outside the convention.",
  file: "Fold_Towels-static-3.MP4",
};

export const demoProfiles = [
  { version: "v1-drive", type: "Google Drive", label: "Assigned Drive folder", from: "Oct 20", to: "Nov 9", naming: "household-guide-v1", status: "Manual confirmation" },
  { version: "v2-oss", type: "OSS", label: "Object storage, provider TBD", from: "Nov 10", to: null, naming: "household-guide-v1", status: "Not connected" },
];
