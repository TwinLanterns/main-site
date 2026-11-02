// lib/ops/forecast.ts
//
// Operator-level production estimate (Nov 2 brief):
//
//   capacity          = daily_seconds × remaining_recording_days
//   remaining_target  = max(0, target − recorded_to_date)     (if a target exists)
//   forecast_recorded = min(capacity, remaining_target)       (else = capacity)
//   forecast_approved = forecast_recorded × acceptance_rate   (only if a rate is supplied)
//
// Withdrawn operators never count. Paused operators and anyone not yet
// activated (pipeline) are excluded unless the scenario opts in, and that
// scenario is labelled separately.

export interface ForecastInput {
  enrollmentId: string;
  code: string;
  collectionStage: string;
  /** Activation/readiness confirmed by a manager for this project. */
  activated: boolean;
  recordedToDateSeconds: number;
  targetSeconds: number | null;
  dailySeconds: number | null;
  remainingDays: number | null;
  acceptanceRate: number | null;
  assumptionSource: string;
  horizon: { start: string; end: string } | null;
}

export interface ForecastRow {
  input: ForecastInput;
  included: boolean;
  bucket: "committed" | "pipeline" | "paused" | "excluded";
  reason: string;
  capacitySeconds: number | null;
  remainingTargetSeconds: number | null;
  forecastRecordedSeconds: number | null;
  forecastApprovedSeconds: number | null;
}

export interface ScenarioOptions {
  includePipeline: boolean;
  includePaused: boolean;
}

export function forecastOperator(i: ForecastInput, opts: ScenarioOptions): ForecastRow {
  const out = (
    bucket: ForecastRow["bucket"],
    included: boolean,
    reason: string,
    calc?: Partial<ForecastRow>,
  ): ForecastRow => ({
    input: i,
    bucket,
    included,
    reason,
    capacitySeconds: null,
    remainingTargetSeconds: null,
    forecastRecordedSeconds: null,
    forecastApprovedSeconds: null,
    ...calc,
  });

  if (i.collectionStage === "withdrawn") return out("excluded", false, "Withdrawn — no future production.");
  if (i.collectionStage === "completed") return out("excluded", false, "Collection marked completed.");
  if (i.dailySeconds === null || i.remainingDays === null) {
    return out("excluded", false, "No documented daily rate / remaining days.");
  }

  const capacity = i.dailySeconds * i.remainingDays;
  const remainingTarget =
    i.targetSeconds === null ? null : Math.max(0, i.targetSeconds - i.recordedToDateSeconds);
  const recorded = remainingTarget === null ? capacity : Math.min(capacity, remainingTarget);
  const approved = i.acceptanceRate === null ? null : Math.round(recorded * i.acceptanceRate);
  const calc = {
    capacitySeconds: capacity,
    remainingTargetSeconds: remainingTarget,
    forecastRecordedSeconds: recorded,
    forecastApprovedSeconds: approved,
  };

  if (i.collectionStage === "paused") {
    return out("paused", opts.includePaused, opts.includePaused
      ? "Paused — included because the scenario includes paused operators."
      : "Paused — excluded until recording resumes.", calc);
  }
  if (!i.activated) {
    return out("pipeline", opts.includePipeline, opts.includePipeline
      ? "Not yet activated — included in the pipeline scenario only."
      : "Not yet activated — pipeline, not committed production.", calc);
  }
  return out("committed", true, "Activated with documented assumptions.", calc);
}

export function forecastScenario(inputs: ForecastInput[], opts: ScenarioOptions) {
  const rows = inputs.map((i) => forecastOperator(i, opts));
  const included = rows.filter((r) => r.included);
  const sum = (k: "forecastRecordedSeconds" | "forecastApprovedSeconds") =>
    included.reduce((s, r) => s + (r[k] ?? 0), 0);
  const allHaveRate = included.length > 0 && included.every((r) => r.forecastApprovedSeconds !== null);
  return {
    rows,
    label: opts.includePipeline || opts.includePaused ? "Scenario incl. unconfirmed operators" : "Committed operators only",
    forecastRecordedSeconds: sum("forecastRecordedSeconds"),
    // Only meaningful when every included operator has a supplied rate.
    forecastApprovedSeconds: allHaveRate ? sum("forecastApprovedSeconds") : null,
    includedCount: included.length,
  };
}
