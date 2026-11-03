"use client";

// app/demo/DemoSandbox.tsx
//
// Public operations demo. Reads only lib/demo/snapshot.ts (synthetic,
// labelled as such) and runs the same pure logic as /ops — naming checks,
// onboarding progress, forecast, overview cards. Every interaction changes
// in-memory state only: nothing is sent anywhere, and a reload resets it.

import Link from "next/link";
import { useMemo, useState } from "react";
import { overviewCards } from "@/lib/ops/metrics";
import { onboardingProgress, HOUSEHOLD_GUIDE_TEMPLATE } from "@/lib/ops/onboarding";
import { forecastScenario } from "@/lib/ops/forecast";
import { forecastInputs } from "@/lib/ops/derive";
import { validateFilePath, GUIDE_RULE_VERSION } from "@/lib/ops/naming";
import { formatHours } from "@/lib/ops/duration";
import { LEAD_STAGES, PIPELINE, isKey } from "@/lib/ops/stages";
import {
  DEMO_DATA_KIND,
  DEMO_SOURCE_DATE,
  demoAssumptions,
  demoFiles,
  demoIssue,
  demoOperators,
  demoProduction,
  demoProfiles,
  demoProject,
  demoSession,
  demoSteps,
  demoTemplateSteps,
  type DemoOperator,
} from "@/lib/demo/snapshot";
import { Badge, Field, Panel, StatCard, button, ghostButton, input } from "../ops/_components/ui";

const STEPS = [
  { key: "overview", label: "1 · Project overview" },
  { key: "operator", label: "2 · Sourcing → onboarding" },
  { key: "recording", label: "3 · Recording and files" },
  { key: "forecast", label: "4 · Production vs. estimate" },
  { key: "issue", label: "5 · Exception and resolution" },
  { key: "delivery", label: "6 · Delivery profile" },
] as const;
type Step = (typeof STEPS)[number]["key"];

const stageLabel = (s: string) => (isKey(LEAD_STAGES, s) ? LEAD_STAGES[s] : s);

export default function DemoSandbox() {
  const [step, setStep] = useState<Step>("overview");
  const [operators, setOperators] = useState<DemoOperator[]>(demoOperators);
  const [steps, setSteps] = useState(demoSteps);
  const [log, setLog] = useState<string[]>([]);
  const note = (s: string) => setLog((l) => [`${new Date().toLocaleTimeString()} · ${s} (sandbox)`, ...l].slice(0, 12));
  const reset = () => {
    setOperators(demoOperators);
    setSteps(demoSteps);
    setLog([]);
  };

  return (
    <div className="min-h-screen bg-white px-4 pb-24 pt-32 text-ink sm:pt-36">
      <div className="mx-auto max-w-6xl sm:px-2">
        <p className="label">Pilot workflow demonstration</p>
        <h1 className="display mt-4 text-5xl leading-[1.02] md:text-6xl">How we run a household collection pilot.</h1>
        <p className="mt-6 max-w-3xl text-[17px] leading-relaxed text-muted">
          Twin Lanterns sources recording operators, onboards and trains them, coordinates recording through a project manager, tracks production, and organizes delivery to each project&apos;s requirements. This is the operations workspace that brings those steps together.
        </p>

        <div role="note" className="mt-8 rounded-[18px] border border-amber/30 bg-amber/[0.06] px-5 py-4 text-sm leading-relaxed text-neutral-800">
          <strong className="font-medium text-amber">{DEMO_DATA_KIND === "synthetic" ? "Synthetic sample data." : "Approved anonymized snapshot."}</strong>{" "}
          {DEMO_DATA_KIND === "synthetic"
            ? "Operator codes, hours, dates and files here are invented to show the workflow. They are not company results."
            : `Source as of ${DEMO_SOURCE_DATE}.`}{" "}
          The workspace itself is newly built: it consolidates the trackers, sheets and shift board already in use. Changes you make here are a sandbox. They stay in your browser and reset on reload.
          <button type="button" onClick={reset} className="ml-2 underline">
            Reset sandbox
          </button>
        </div>

        <nav aria-label="Demo steps" className="mt-10 flex flex-wrap gap-2">
          {STEPS.map((s) => (
            <button
              key={s.key}
              type="button"
              aria-current={step === s.key ? "step" : undefined}
              onClick={() => setStep(s.key)}
              className={step === s.key ? "rounded-full border border-ink bg-ink px-4 py-2 text-sm text-white" : ghostButton}
            >
              {s.label}
            </button>
          ))}
        </nav>

        <div className="mt-6">
          {step === "overview" && <Overview operators={operators} />}
          {step === "operator" && <OperatorJourney operators={operators} setOperators={setOperators} steps={steps} setSteps={setSteps} note={note} />}
          {step === "recording" && <Recording />}
          {step === "forecast" && <Forecast operators={operators} />}
          {step === "issue" && <IssueStep note={note} />}
          {step === "delivery" && <Delivery note={note} />}
        </div>

        {log.length > 0 && (
          <Panel title="Sandbox actions (simulated, not saved)" className="mt-6">
            <ul className="space-y-0.5 text-xs text-neutral-600">
              {log.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          </Panel>
        )}

        <div className="mt-14 flex flex-wrap items-center gap-4 border-t border-line pt-8">
          <Link href="/data-request?interest=managed_collection" className={button}>
            Discuss a collection pilot
          </Link>
          <Link href="/data-request?interest=platform_access" className={ghostButton}>
            Ask about platform access
          </Link>
          <p className="text-xs text-neutral-500">Not shown: storage or OSS integrations (not connected yet), automated quality scoring (none: review is human), customer names, rates and footage.</p>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- overview ------------------------------- */

function Overview({ operators }: { operators: DemoOperator[] }) {
  const scenario = forecastScenario(forecastInputs(operators.map((o) => ({ ...o })), demoProduction, demoAssumptions), { includePipeline: false, includePaused: false });
  const cards = overviewCards({
    enrollments: operators,
    production: demoProduction,
    sessions: [{ state: "completed", duration_seconds: 6480, upload_status: "transfer_reported", review_status: "internal_passed", approved_duration_seconds: null }],
    openIssues: 1,
    openTasksOverdue: 0,
    forecastRemainingSeconds: scenario.forecastRecordedSeconds,
    forecastIncluded: scenario.includedCount,
    period: "Oct 23 – Nov 1",
  });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-600">
        <span className="text-lg text-neutral-900">{demoProject.name}</span>
        <Badge tone="amber">{demoProject.stage}</Badge>
        <Badge>{demoProject.customerAlias}</Badge>
        <span>Manager: {demoProject.manager}</span>
        <span>· {demoProject.location}</span>
        <Badge tone="info">Manual CSV snapshot · as of {DEMO_SOURCE_DATE}</Badge>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <StatCard {...c} key={c.key} />
        ))}
      </div>
      <p className="text-xs text-neutral-500">
        Every card shows its definition and how complete the data is. Missing acceptance data stays unknown, never zero. Workbook daily totals and logged sessions are kept apart so nothing is counted twice.
      </p>
    </div>
  );
}

/* ------------------------------ operator flow ---------------------------- */

function OperatorJourney({
  operators,
  setOperators,
  steps,
  setSteps,
  note,
}: {
  operators: DemoOperator[];
  setOperators: (fn: (o: DemoOperator[]) => DemoOperator[]) => void;
  steps: typeof demoSteps;
  setSteps: (fn: (s: typeof demoSteps) => typeof demoSteps) => void;
  note: (s: string) => void;
}) {
  const [selected, setSelected] = useState("d3");
  const [override, setOverride] = useState("");
  const op = operators.find((o) => o.id === selected)!;
  const records = Object.entries(steps[selected] ?? {}).map(([step_key, v]) => ({ step_key, ...v }));
  const progress = onboardingProgress(demoTemplateSteps, records);

  const move = (id: string, stage: string) => {
    setOperators((ops) => ops.map((o) => (o.id === id ? { ...o, lead_stage: stage } : o)));
    note(`${operators.find((o) => o.id === id)?.anonymous_code} moved to ${stageLabel(stage)}`);
  };
  const setStepStatus = (key: string, status: "completed" | "blocked" | "pending") => {
    setSteps((s) => {
      const mine = { ...(s[selected] ?? {}) };
      if (status === "pending") delete mine[key];
      else mine[key] = status === "blocked" ? { status, reason: "Marked blocked in sandbox" } : { status };
      return { ...s, [selected]: mine };
    });
    note(`${op.anonymous_code}: ${demoTemplateSteps.find((t) => t.key === key)?.label} → ${status}`);
  };
  const confirm = () => {
    if (!progress.allRequiredDone && !override.trim()) return;
    setOperators((ops) => ops.map((o) => (o.id === selected ? { ...o, lead_stage: "activated", readiness_confirmed_at: new Date().toISOString(), readiness_confirmed_label: "You (sandbox)" } : o)));
    note(`${op.anonymous_code} readiness confirmed${progress.allRequiredDone ? "" : ` with override: ${override}`}`);
  };

  const board = operators.filter((o) => !o.readiness_confirmed_at);
  return (
    <div className="space-y-5">
      <Panel title="Sourcing pipeline">
        <p className="mb-3 text-xs text-neutral-500">Leads are tracked from first contact to onboarding. A sourced lead never counts as an active operator. Move a card to see it update (sandbox).</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[...PIPELINE, "onboarding" as const].map((stage) => (
            <section key={stage} aria-label={stageLabel(stage)} className="rounded-[14px] border border-line bg-white">
              <h3 className="border-b border-line px-2 py-1.5 label">{stageLabel(stage)}</h3>
              <ul className="space-y-1.5 p-1.5">
                {board
                  .filter((o) => o.lead_stage === stage)
                  .map((o) => (
                    <li key={o.id} className="rounded border border-line p-2 text-xs">
                      <button type="button" className="font-mono text-neutral-900 underline-offset-2 hover:underline" onClick={() => setSelected(o.id)}>
                        {o.anonymous_code}
                      </button>
                      <p className="text-neutral-500">{o.next_action}</p>
                      <label className="sr-only" htmlFor={`mv-${o.id}`}>
                        Move {o.anonymous_code}
                      </label>
                      <select id={`mv-${o.id}`} value={o.lead_stage} onChange={(e) => move(o.id, e.target.value)} className={`${input} mt-1 py-1 text-xs`}>
                        {[...PIPELINE, "onboarding", "declined"].map((s) => (
                          <option key={s} value={s}>
                            {stageLabel(s)}
                          </option>
                        ))}
                      </select>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Operator">
          <label className="sr-only" htmlFor="demo-op">
            Operator
          </label>
          <select id="demo-op" value={selected} onChange={(e) => setSelected(e.target.value)} className={input}>
            {operators.map((o) => (
              <option key={o.id} value={o.id}>
                {o.anonymous_code} · {stageLabel(o.lead_stage)}
              </option>
            ))}
          </select>
          <dl className="mt-3 space-y-1 text-sm">
            <div>Source: {op.lead_source}</div>
            <div>Outreach: {op.outreach_owner || "—"}</div>
            <div>Onboarding owner: {op.onboarding_owner || "—"}</div>
            <div>Region: {op.location_category}</div>
            <div>Next action: {op.next_action}</div>
          </dl>
          <p className="mt-3 text-xs text-neutral-500">Names, phone numbers and addresses aren&apos;t part of the demo dataset. Internally they sit in a protected record.</p>
        </Panel>

        <Panel title={`Onboarding: ${HOUSEHOLD_GUIDE_TEMPLATE.version}`} className="lg:col-span-2">
          <p className="mb-2 text-sm text-neutral-600">
            {progress.completed} of {progress.applicable} required steps completed{progress.blocked.length ? ` · ${progress.blocked.length} blocked` : ""}. The checklist labels are generalized from the project&apos;s onboarding guide.
          </p>
          <ul className="divide-y divide-line text-sm">
            {demoTemplateSteps
              .filter((s) => s.scope === "onboarding")
              .map((s) => {
                const r = steps[selected]?.[s.key];
                const status = r?.status ?? "pending";
                return (
                  <li key={s.key} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                    <span>
                      {s.label}
                      {r?.reason && <span className="block text-xs text-red-300">{r.reason}</span>}
                    </span>
                    <span className="flex items-center gap-1.5">
                      {op.readiness_confirmed_at ? (
                        <Badge tone={status === "completed" ? "good" : status === "blocked" ? "bad" : "amber"}>{status}</Badge>
                      ) : (
                        <select
                          aria-label={`Set ${s.label}`}
                          value={status === "not_applicable" ? "pending" : status}
                          onChange={(e) => setStepStatus(s.key, e.target.value as "completed" | "blocked" | "pending")}
                          className={`${input} w-32 py-1 text-xs ${status === "completed" ? "border-emerald-500/40 text-emerald-300" : status === "blocked" ? "border-red-500/40 text-red-300" : "text-amber"}`}
                        >
                          <option value="pending">pending</option>
                          <option value="completed">completed</option>
                          <option value="blocked">blocked</option>
                        </select>
                      )}
                    </span>
                  </li>
                );
              })}
          </ul>
          <div className="mt-3 rounded-[14px] border border-line p-3">
            {op.readiness_confirmed_at ? (
              <p className="text-sm text-emerald-300">
                Ready to record: confirmed by {op.readiness_confirmed_label}. Collection status: {op.collection_stage.replace("_", " ")}.
              </p>
            ) : (
              <div className="flex flex-wrap items-end gap-2">
                {!progress.allRequiredDone && (
                  <Field name="Override reason (steps outstanding)" className="flex-1">
                    <input value={override} onChange={(e) => setOverride(e.target.value)} className={input} />
                  </Field>
                )}
                <button type="button" className={button} disabled={!progress.allRequiredDone && !override.trim()} onClick={confirm}>
                  Manager confirms readiness
                </button>
                <p className="w-full text-xs text-neutral-500">Readiness is never automatic at a percentage. A manager confirms it, and any override needs a recorded reason.</p>
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* --------------------------- recording and files ------------------------- */

function Recording() {
  const [path, setPath] = useState("OP-101/10-31-2026/kitchen/wipe-counter-Movement-02.mp4");
  const known = useMemo(() => new Set(demoOperators.map((o) => o.anonymous_code)), []);
  const results = demoFiles.map((f) => ({ f, r: validateFilePath(f, { knownOperators: known }) }));
  const tryIt = validateFilePath(path, { knownOperators: known });
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Recording session · OP-101">
        <dl className="space-y-1 text-sm">
          <div>{demoSession.when}</div>
          <div>
            {demoSession.fromShiftBoard && <Badge tone="info">Booked through the shift board</Badge>} <Badge>{demoSession.coordination}</Badge>
          </div>
          <div>
            Task {demoSession.task} · room {demoSession.room} · {demoSession.device}
          </div>
          <div>Check-in: {demoSession.checkin}</div>
          <div className="flex flex-wrap gap-1">
            {HOUSEHOLD_GUIDE_TEMPLATE.steps
              .filter((s) => s.scope === "session")
              .map((s) => (
                <Badge key={s.key} tone={demoSession.checks[s.key] === "completed" ? "good" : "neutral"}>
                  {s.label}
                </Badge>
              ))}
          </div>
        </dl>
        <table className="mt-3 w-full text-sm">
          <tbody className="divide-y divide-line">
            {[
              ["Recording", `${demoSession.state} · ${demoSession.duration}`],
              ["Upload", demoSession.upload],
              ["Internal review", demoSession.review],
              ["Customer acceptance", demoSession.customer],
            ].map(([k, v]) => (
              <tr key={k}>
                <td className="py-1.5 pr-3 text-neutral-500">{k}</td>
                <td className="py-1.5">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-neutral-500">Each stage is recorded separately. Completing a recording doesn&apos;t mark it uploaded, and internal review never stands in for customer acceptance.</p>
      </Panel>

      <Panel title="Files from that session">
        <p className="mb-2 text-xs text-neutral-500">
          Rule {GUIDE_RULE_VERSION}: <code className="font-mono">operator/MM-DD-YYYY/room/task-Static|Movement-NN.mp4</code>. Original names are kept. A suggested fix is a manifest note, not a rename.
        </p>
        <ul className="space-y-2">
          {results.map(({ f, r }) => (
            <li key={f} className="rounded border border-line p-2">
              <code className="block break-all font-mono text-xs">{f}</code>
              <Badge tone={r.status === "valid" ? "good" : r.status === "warning" ? "amber" : "bad"}>{r.status}</Badge>
              {r.issues.map((i, n) => (
                <p key={n} className={`text-xs ${i.level === "error" ? "text-red-300" : "text-amber"}`}>
                  {i.message}
                </p>
              ))}
              {r.suggestion && <p className="text-xs text-neutral-600">Suggested: <code className="font-mono">{r.suggestion}</code></p>}
            </li>
          ))}
        </ul>
        <Field name="Try a path" className="mt-4">
          <input value={path} onChange={(e) => setPath(e.target.value)} className={`${input} font-mono text-xs`} />
        </Field>
        <p className="mt-1 text-xs">
          <Badge tone={tryIt.status === "valid" ? "good" : tryIt.status === "warning" ? "amber" : "bad"}>{tryIt.status}</Badge>{" "}
          {tryIt.issues.map((i) => i.message).join(" ")}
          {tryIt.suggestion && <span className="block text-neutral-600">Suggested: {tryIt.suggestion}</span>}
        </p>
        <p className="mt-2 text-xs text-neutral-500">A passing name confirms formatting only. It says nothing about footage quality.</p>
      </Panel>
    </div>
  );
}

/* -------------------------------- forecast ------------------------------- */

function Forecast({ operators }: { operators: DemoOperator[] }) {
  const [pipeline, setPipeline] = useState(false);
  const [paused, setPaused] = useState(false);
  const sc = forecastScenario(forecastInputs(operators, demoProduction, demoAssumptions), { includePipeline: pipeline, includePaused: paused });
  return (
    <Panel title="Recorded output vs. estimate">
      <p className="mb-3 text-sm text-neutral-600">
        Per operator: capacity = daily hours × remaining days; capped at any documented remaining target. No acceptance rate is applied unless one is supported, so there&apos;s no &quot;approved&quot; estimate here.
      </p>
      <div className="mb-3 flex flex-wrap gap-2">
        <button type="button" aria-pressed={pipeline} onClick={() => setPipeline((v) => !v)} className={`${ghostButton} ${pipeline ? "border-amber" : ""}`}>
          {pipeline ? "✓ " : ""}Include pipeline
        </button>
        <button type="button" aria-pressed={paused} onClick={() => setPaused((v) => !v)} className={`${ghostButton} ${paused ? "border-amber" : ""}`}>
          {paused ? "✓ " : ""}Include paused
        </button>
        <Badge tone={pipeline || paused ? "amber" : "neutral"}>{sc.label}</Badge>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-max text-sm">
          <thead className="text-left label">
            <tr>
              {["Operator", "Bucket", "Submitted to date", "Target", "Rate × days", "Forecast", "Note"].map((h) => (
                <th key={h} className="px-2 py-1.5 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {sc.rows
              .filter((r) => r.capacitySeconds !== null || r.input.recordedToDateSeconds > 0)
              .map((r) => (
                <tr key={r.input.enrollmentId} className={r.included ? "" : "opacity-60"}>
                  <td className="px-2 py-1.5 font-mono">{r.input.code}</td>
                  <td className="px-2 py-1.5">
                    <Badge tone={r.bucket === "committed" ? "good" : "amber"}>{r.bucket}</Badge>
                  </td>
                  <td className="px-2 py-1.5">{formatHours(r.input.recordedToDateSeconds)}</td>
                  <td className="px-2 py-1.5">{r.input.targetSeconds === null ? "none" : formatHours(r.input.targetSeconds)}</td>
                  <td className="px-2 py-1.5">{r.input.dailySeconds !== null ? `${formatHours(r.input.dailySeconds)} × ${r.input.remainingDays}` : "—"}</td>
                  <td className="px-2 py-1.5">{formatHours(r.forecastRecordedSeconds)}</td>
                  <td className="px-2 py-1.5 text-xs text-neutral-500">{r.reason}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm">
        Estimated remaining recorded output: <strong className="font-medium">{formatHours(sc.forecastRecordedSeconds)}</strong> <Badge tone="info">Estimate</Badge>
      </p>
    </Panel>
  );
}

/* ---------------------------------- issue -------------------------------- */

function IssueStep({ note }: { note: (s: string) => void }) {
  const [action, setAction] = useState("");
  const [result, setResult] = useState("");
  const [resolved, setResolved] = useState(false);
  return (
    <Panel title="Operational exception (simulated in the sandbox)">
      <p className="mb-3 text-xs text-neutral-500">This example is invented to show the workflow. It isn&apos;t a past company incident.</p>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge tone={resolved ? "good" : "amber"}>{resolved ? "Resolved" : "Open"}</Badge>
        <Badge>{demoIssue.category}</Badge>
        <span className="font-mono text-xs">{demoIssue.file}</span>
        <span className="text-xs text-neutral-500">opened {demoIssue.opened} · OP-101</span>
      </div>
      <p className="mt-2 text-sm">{demoIssue.description}</p>
      {resolved ? (
        <div className="mt-3 text-sm text-neutral-700">
          <p>Action: {action}</p>
          <p>Result: {result}</p>
        </div>
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Field name="Action taken">
            <input value={action} onChange={(e) => setAction(e.target.value)} placeholder="Texted the operator the corrected names" className={input} />
          </Field>
          <Field name="Actual result">
            <input value={result} onChange={(e) => setResult(e.target.value)} placeholder="Manifest updated with proposed names" className={input} />
          </Field>
          <div className="sm:col-span-2">
            <button
              type="button"
              className={button}
              disabled={!action.trim() || !result.trim()}
              onClick={() => {
                setResolved(true);
                note("Naming issue resolved");
              }}
            >
              Resolve (requires action and result)
            </button>
          </div>
        </div>
      )}
    </Panel>
  );
}

/* -------------------------------- delivery ------------------------------- */

function Delivery({ note }: { note: (s: string) => void }) {
  const [profiles, setProfiles] = useState(demoProfiles);
  const [type, setType] = useState("Other");
  return (
    <Panel title="Project delivery profile">
      <p className="mb-3 text-sm text-neutral-600">
        Each project sets its own destination, folder structure, naming rule and upload instructions. Versions are dated, so moving from Drive to object storage doesn&apos;t rewrite how earlier batches were delivered. Uploads are confirmed manually. No storage provider is connected.
      </p>
      <ul className="space-y-2 text-sm">
        {profiles.map((p) => (
          <li key={p.version} className="flex flex-wrap items-center gap-2 rounded border border-line p-2">
            <span className="font-mono">{p.version}</span>
            <Badge tone="amber">{p.type}</Badge>
            <span>{p.label}</span>
            <span className="text-xs text-neutral-500">
              {p.from} – {p.to ?? "current"} · naming {p.naming}
            </span>
            <Badge>{p.status}</Badge>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-end gap-2">
        <Field name="Add a version (sandbox)">
          <select value={type} onChange={(e) => setType(e.target.value)} className={input}>
            <option>Other</option>
            <option>OSS</option>
            <option>Google Drive</option>
          </select>
        </Field>
        <button
          type="button"
          className={ghostButton}
          onClick={() => {
            const v = `v${profiles.length + 1}-sandbox`;
            setProfiles((ps) => [...ps.map((p) => (p.to ? p : { ...p, to: "today" })), { version: v, type, label: "Sandbox destination", from: "today", to: null, naming: "household-guide-v1", status: "Not connected" }]);
            note(`Delivery profile ${v} added; no files moved`);
          }}
        >
          Add version
        </button>
      </div>
      <p className="mt-2 text-xs text-neutral-500">Changing the profile never transfers or exposes footage.</p>
    </Panel>
  );
}
