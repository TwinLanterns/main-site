// lib/ops/onboarding.ts
//
// Onboarding templates and progress. A template lists what a project
// requires; completion is recorded per operator with who/when/evidence.
// Progress is computed over applicable required steps only, and readiness
// is never inferred from it — a manager confirms it explicitly.

export type StepScope = "onboarding" | "session";
export type StepStatus = "pending" | "completed" | "blocked" | "not_applicable";

export interface TemplateStep {
  key: string;
  label: string;
  required: boolean;
  scope: StepScope;
  note?: string;
}

export interface StepRecord {
  step_key: string;
  status: StepStatus;
  reason?: string;
}

/**
 * Starting template mapped from "Onboarding Video Guide.pdf" as summarized
 * in the Nov 2 brief. Labels are deliberately general (the full guide may be
 * confidential); review against the PDF before marking it active.
 */
export const HOUSEHOLD_GUIDE_TEMPLATE: { version: string; name: string; source: string; steps: TemplateStep[]; clarifications: string[] } = {
  version: "household-guide-v1",
  name: "Household collection — operator onboarding",
  source: "Onboarding Video Guide.pdf (supplied by Carlos, Nov 2 2026) — mapping pending review",
  steps: [
    { key: "eligibility", label: "Eligibility and availability confirmed", required: true, scope: "onboarding" },
    { key: "consent_status", label: "Required permissions / consent status recorded", required: true, scope: "onboarding", note: "Operational record only — not proof of legal permission. Signed forms stay out of this system." },
    { key: "instructions", label: "Recording instructions provided (record version)", required: true, scope: "onboarding" },
    { key: "training", label: "Video guide training completed", required: true, scope: "onboarding" },
    { key: "equipment", label: "Camera assigned / receipt confirmed", required: true, scope: "onboarding" },
    { key: "power_sd", label: "Power and SD card setup checked", required: true, scope: "onboarding" },
    { key: "upload_process", label: "File organization and upload process walked through", required: true, scope: "onboarding" },
    { key: "framing_test", label: "Mandatory framing test reviewed", required: true, scope: "onboarding" },
    { key: "qr_config", label: "Configuration QR confirmed", required: true, scope: "session" },
    { key: "mounting", label: "Camera mounted and checked", required: true, scope: "session" },
    { key: "framing_check", label: "Framing checked before recording", required: true, scope: "session" },
    { key: "pre_recording", label: "Pre-recording readiness and prohibited-content review", required: true, scope: "session" },
  ],
  clarifications: [
    "Footwear: the checklist says closed-toe shoes but also allows socks.",
    "Framing wording differs between the framing test and the task rejection description.",
    "10-hour room cap: per operator, household, project, or another period?",
    "Upload step says Drive; project-specific OSS instructions may supersede it.",
    "Task instructions and reference videos linked from the guide were not inspected.",
  ],
};

export function onboardingProgress(steps: TemplateStep[], records: StepRecord[]) {
  const byKey = new Map(records.map((r) => [r.step_key, r]));
  const required = steps.filter((s) => s.scope === "onboarding" && s.required);
  const applicable = required.filter((s) => byKey.get(s.key)?.status !== "not_applicable");
  const completed = applicable.filter((s) => byKey.get(s.key)?.status === "completed");
  const blocked = applicable.filter((s) => byKey.get(s.key)?.status === "blocked");
  return {
    applicable: applicable.length,
    completed: completed.length,
    blocked: blocked.map((s) => ({ ...s, reason: byKey.get(s.key)?.reason ?? "" })),
    outstanding: applicable.filter((s) => byKey.get(s.key)?.status !== "completed"),
    allRequiredDone: applicable.length > 0 && completed.length === applicable.length,
  };
}
