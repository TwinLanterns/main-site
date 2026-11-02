// lib/ops/stages.ts
//
// Enum values + display labels. Must match the CHECK constraints in
// supabase/ops_core.sql.

export const LEAD_STAGES = {
  new_lead: "New lead",
  outreach_pending: "Outreach pending",
  contacted: "Contacted",
  awaiting_reply: "Awaiting reply",
  interested: "Interested",
  qualification: "Qualification",
  ready_for_onboarding: "Ready for onboarding",
  onboarding: "Onboarding",
  activated: "Activated",
  declined: "Declined",
  not_reachable: "Not reachable",
  archived: "Archived",
} as const;
export type LeadStage = keyof typeof LEAD_STAGES;

/** Pipeline columns, in order, for the board view. */
export const PIPELINE: LeadStage[] = [
  "new_lead",
  "outreach_pending",
  "contacted",
  "awaiting_reply",
  "interested",
  "qualification",
  "ready_for_onboarding",
];
export const CLOSED_LEAD_STAGES: LeadStage[] = ["declined", "not_reachable", "archived"];

export const COLLECTION_STAGES = {
  not_started: "Not started",
  recording: "Recording",
  paused: "Paused",
  completed: "Completed",
  withdrawn: "Withdrawn",
} as const;
export type CollectionStage = keyof typeof COLLECTION_STAGES;

export const SESSION_STATES = {
  planned: "Planned",
  confirmed: "Confirmed",
  in_progress: "In progress",
  completed: "Completed",
  canceled: "Canceled",
  missed: "Missed",
} as const;

export const UPLOAD_STATES = {
  not_uploaded: "Not uploaded",
  transfer_reported: "Transfer reported",
  transfer_verified: "Transfer verified",
} as const;

export const REVIEW_STATES = {
  not_reviewed: "Not reviewed",
  internal_passed: "Internal review passed",
  internal_failed: "Internal review failed",
  customer_accepted: "Customer accepted",
  customer_rejected: "Customer rejected",
  partial: "Partially accepted",
} as const;

export const FILE_SUBMISSION_STATES = {
  pending_upload: "Pending upload",
  transfer_reported: "Transfer reported",
  transfer_verified: "Transfer verified",
  delivered: "Delivered",
  customer_acknowledged: "Customer acknowledged",
} as const;

export const ISSUE_CATEGORIES = {
  onboarding: "Onboarding",
  equipment: "Equipment",
  scheduling: "Scheduling",
  upload: "Upload",
  naming: "Naming",
  recording_quality: "Recording quality",
  other: "Other",
} as const;

export const COORDINATION_MODES = {
  remote: "Remote coordination",
  on_site: "On site",
  hybrid: "Remote + on site",
} as const;

/** Workbook legend: active within 3 days of an upload, offboard review after 7. */
export const NO_RECENT_UPLOAD_DAYS = 3;
export const OFFBOARD_REVIEW_DAYS = 7;

export function isKey<T extends object>(obj: T, k: unknown): k is keyof T {
  return typeof k === "string" && Object.prototype.hasOwnProperty.call(obj, k);
}
