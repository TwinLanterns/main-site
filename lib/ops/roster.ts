// lib/ops/roster.ts
//
// Fields a roster / lead-sheet CSV column can be mapped to on /ops/import.

export const ROSTER_FIELDS = ["name", "phone", "email", "intake_ref", "sourced_by", "lead_source", "channel", "lead_stage", "next_action", "availability", "notes"] as const;
export type RosterField = (typeof ROSTER_FIELDS)[number];
