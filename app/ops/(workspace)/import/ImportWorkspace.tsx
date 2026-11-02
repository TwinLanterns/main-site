"use client";

// app/ops/(workspace)/import/ImportWorkspace.tsx
//
// Two imports, both preview-then-commit. The file stays in the form, so the
// commit re-sends the same upload with the options confirmed in the preview.

import { useRef, useState, useTransition } from "react";
import { formatHMS, formatHours } from "@/lib/ops/duration";
import { ROSTER_FIELDS } from "@/lib/ops/roster";
import { commitProduction, commitRoster, previewProduction, previewRoster, type ProductionPreview, type RosterPreview } from "./actions";
import { Badge, Field, Table, button, ghostButton, input, td } from "../../_components/ui";

type Fail = { ok: false; error: string };

export default function ImportWorkspace({ projectId, today }: { projectId: string; today: string }) {
  const [mode, setMode] = useState<"production" | "roster">("production");
  return (
    <div className="space-y-4">
      <div className="flex gap-2" role="tablist">
        <button role="tab" aria-selected={mode === "production"} className={`${ghostButton} ${mode === "production" ? "border-amber" : ""}`} onClick={() => setMode("production")}>
          Production workbook tab
        </button>
        <button role="tab" aria-selected={mode === "roster"} className={`${ghostButton} ${mode === "roster" ? "border-amber" : ""}`} onClick={() => setMode("roster")}>
          Lead / roster sheet
        </button>
      </div>
      {mode === "production" ? <ProductionImport projectId={projectId} today={today} /> : <RosterImport projectId={projectId} today={today} />}
    </div>
  );
}

function Message({ error, done }: { error: string | null; done: string | null }) {
  return (
    <>
      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
      {done && (
        <p role="status" className="text-sm text-emerald-300">
          {done}
        </p>
      )}
    </>
  );
}

function ProductionImport({ projectId, today }: { projectId: string; today: string }) {
  const form = useRef<HTMLFormElement>(null);
  const [preview, setPreview] = useState<ProductionPreview | null>(null);
  const [groupDates, setGroupDates] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const fd = () => {
    const d = new FormData(form.current!);
    d.set("project_id", projectId);
    d.set("group_dates", JSON.stringify(groupDates));
    return d;
  };
  const run = (fn: () => Promise<ProductionPreview | Fail | { ok: true; message: string }>) =>
    start(async () => {
      setError(null);
      setDone(null);
      const r = await fn();
      if (!r.ok) return setError(r.error);
      if ("message" in r) {
        setDone(r.message);
        setPreview(null);
      } else setPreview(r);
    });

  return (
    <form ref={form} onSubmit={(e) => e.preventDefault()} className="space-y-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <p className="text-sm text-neutral-600">
        Export one tab of the weekly production workbook as CSV (values, not formulas). Dates come from the date row above the headers, not the tab label. Submitted/Accepted are read as h:mm:ss. Blank Accepted cells stay unknown. The sheet&apos;s own totals are compared, not used.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Field name="CSV file">
          <input type="file" name="file" accept=".csv,text/csv" required className={input} onChange={() => setPreview(null)} />
        </Field>
        <Field name="Source tab">
          <input name="source_tab" required placeholder="W42 Production" className={input} />
        </Field>
        <Field name="Source as of (export date)">
          <input type="date" name="source_as_of" required defaultValue={today} className={input} />
        </Field>
        <Field name="Year for dates without one">
          <input name="default_year" inputMode="numeric" placeholder="2026" className={input} />
        </Field>
        <Field name="Bare numbers in time columns">
          <select name="numeric_unit" className={input} defaultValue="reject">
            <option value="reject">Reject (confirm unit first)</option>
            <option value="fraction_of_day">Excel fraction of a day</option>
          </select>
        </Field>
      </div>
      <button type="button" disabled={pending} className={button} onClick={() => run(() => previewProduction(fd()))}>
        {pending && !preview ? "Reading…" : "Preview"}
      </button>
      <Message error={error} done={done} />

      {preview && (
        <div className="space-y-4 border-t border-neutral-200 pt-4">
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge>Layout: {preview.layout === "w41" ? "W41 (no State column)" : "W42/W43 (with State)"}</Badge>
            <Badge>Header row {preview.headerRow}</Badge>
            <Badge tone="good">{preview.counts.new} new</Badge>
            <Badge tone="info">{preview.counts.update} updates</Badge>
            <Badge>{preview.counts.unchanged} unchanged</Badge>
            <Badge tone={preview.counts.conflict ? "bad" : "neutral"}>{preview.counts.conflict} conflicts</Badge>
            <Badge tone={preview.rejected.length ? "amber" : "neutral"}>{preview.rejected.length} rejected cells</Badge>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">Day groups</h3>
            <div className="flex flex-wrap gap-3">
              {preview.groups.map((g) => {
                const letter = g.columns.split("–")[0];
                return (
                  <label key={g.columns} className="space-y-1 text-xs">
                    <span className="block text-neutral-500">
                      {g.columns}: “{g.dateRaw || "blank"}” → {g.date ?? "unreadable"}
                    </span>
                    <input
                      type="date"
                      value={groupDates[letter] ?? g.date ?? ""}
                      onChange={(e) => setGroupDates((d) => ({ ...d, [letter]: e.target.value }))}
                      className={`${input} w-40`}
                      aria-label={`Confirm date for columns ${g.columns}`}
                    />
                  </label>
                );
              })}
            </div>
            <p className="mt-1 text-xs text-neutral-500">Correct a date only after verifying it against the sheet. Re-run Preview after changing one.</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">Recomputed from rows</h3>
              <p className="text-sm">
                Submitted {formatHours(preview.recomputed.submittedSeconds)} over {preview.recomputed.submittedCells} operator-days · Accepted{" "}
                {preview.recomputed.acceptedCells ? formatHours(preview.recomputed.acceptedSeconds) : "unknown (no values)"} · Commit {preview.recomputed.commit} (unit unconfirmed)
              </p>
              {preview.discrepancies.length > 0 && (
                <div className="mt-2">
                  <h4 className="text-xs font-medium text-amber">Sheet totals that don&apos;t match the rows (kept as source values)</h4>
                  <ul className="mt-1 space-y-0.5 text-xs text-neutral-700">
                    {preview.discrepancies.map((d) => (
                      <li key={d.scope}>
                        {d.scope}: sheet “{d.sourceRaw}” ({d.sourceValue}) vs rows {d.recomputed}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">Operators ({preview.operators.length})</h3>
              <ul className="space-y-0.5 text-xs">
                {preview.operators.map((o) => (
                  <li key={o.operatorId} className="flex flex-wrap gap-2">
                    <span className="font-mono">{o.operatorId}</span>
                    {o.matched ? <Badge tone="good">→ {o.matched}</Badge> : <Badge tone="amber">not on project yet</Badge>}
                    {o.placeholder && <Badge tone="amber">possible placeholder</Badge>}
                    {o.deviceId && <span className="text-neutral-500">{o.deviceId}</span>}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {preview.warnings.length > 0 && (
            <details open>
              <summary className="cursor-pointer text-xs font-medium uppercase tracking-wider text-amber">Warnings ({preview.warnings.length})</summary>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-neutral-700">
                {preview.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </details>
          )}
          {preview.rejected.length > 0 && (
            <details>
              <summary className="cursor-pointer text-xs font-medium uppercase tracking-wider text-red-300">Rejected ({preview.rejected.length})</summary>
              <ul className="mt-1 space-y-0.5 text-xs text-neutral-700">
                {preview.rejected.map((r, i) => (
                  <li key={i}>
                    Row {r.row}
                    {r.column && `, ${r.column}`}: {r.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}

          <details>
            <summary className="cursor-pointer text-xs font-medium uppercase tracking-wider text-neutral-500">Rows to import ({preview.sample.length} shown)</summary>
            <div className="mt-2">
              <Table head={["Row", "Operator", "Date", "Commit", "Submitted", "Accepted", "Change"]}>
                {preview.sample.map((c) => (
                  <tr key={`${c.operatorId}-${c.date}`}>
                    <td className={td}>{c.sourceRow}</td>
                    <td className={`${td} font-mono text-xs`}>{c.operatorId}</td>
                    <td className={td}>{c.date}</td>
                    <td className={td}>{c.commit ?? "—"}</td>
                    <td className={td}>{formatHMS(c.submittedSeconds)}</td>
                    <td className={td}>{c.acceptedSeconds === null ? "unknown" : formatHMS(c.acceptedSeconds)}</td>
                    <td className={td}>
                      <Badge tone={c.cls === "conflict" ? "bad" : c.cls === "new" ? "good" : "neutral"}>{c.cls}</Badge>
                    </td>
                  </tr>
                ))}
              </Table>
            </div>
          </details>

          <div className="space-y-2 rounded-md border border-neutral-200 p-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="create_unknown" /> Create unconfirmed operator records for IDs not on this project (names stay private; each needs confirming before it counts)
            </label>
            {preview.counts.conflict > 0 && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="overwrite_conflicts" /> Overwrite {preview.counts.conflict} operator-days already written by a newer source
              </label>
            )}
            <button type="button" disabled={pending} className={button} onClick={() => run(() => commitProduction(fd()))}>
              {pending ? "Importing…" : "Commit import"}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}

function RosterImport({ projectId, today }: { projectId: string; today: string }) {
  const form = useRef<HTMLFormElement>(null);
  const [headers, setHeaders] = useState<string[] | null>(null);
  const [mapping, setMapping] = useState<Record<string, number>>({});
  const [rows, setRows] = useState<RosterPreview["rows"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const fd = (withMapping: boolean) => {
    const d = new FormData(form.current!);
    d.set("project_id", projectId);
    if (withMapping) d.set("mapping", JSON.stringify(mapping));
    return d;
  };

  const readColumns = () =>
    start(async () => {
      setError(null);
      setDone(null);
      setRows(null);
      const r = await previewRoster(fd(false));
      if (!r.ok) return setError(r.error);
      setHeaders(r.headers);
      // Pre-select columns whose header matches a field name.
      const guess: Record<string, number> = {};
      r.headers.forEach((h, i) => {
        const k = h.toLowerCase().replace(/[^a-z]+/g, "_").replace(/^_|_$/g, "");
        const f = ROSTER_FIELDS.find((x) => x === k || (x === "lead_stage" && k === "stage") || (x === "intake_ref" && k === "intake_id"));
        if (f) guess[f] = i;
      });
      setMapping(guess);
    });

  const previewRows = () =>
    start(async () => {
      setError(null);
      const r = await previewRoster(fd(true));
      if (!r.ok) return setError(r.error);
      setRows(r.rows);
    });

  const commit = () =>
    start(async () => {
      setError(null);
      const r = await commitRoster(fd(true));
      if (!r.ok) return setError(r.error);
      setDone(r.message);
      setRows(null);
      setHeaders(null);
    });

  return (
    <form ref={form} onSubmit={(e) => e.preventDefault()} className="space-y-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <p className="text-sm text-neutral-600">
        Import a sanitized lead sheet (e.g. Neal&apos;s leads). Rows matching an existing person by phone or intake ID are never merged automatically. Add those by hand after confirming. Contact details go only to the protected person record.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field name="CSV file">
          <input type="file" name="file" accept=".csv,text/csv" required className={input} onChange={() => (setHeaders(null), setRows(null))} />
        </Field>
        <Field name="Default “sourced by”">
          <input name="default_sourced_by" placeholder="Neal" className={input} />
        </Field>
        <Field name="Source as of">
          <input type="date" name="source_as_of" defaultValue={today} className={input} />
        </Field>
      </div>
      <button type="button" disabled={pending} className={button} onClick={readColumns}>
        Read columns
      </button>
      <Message error={error} done={done} />

      {headers && (
        <div className="space-y-3 border-t border-neutral-200 pt-4">
          <h3 className="text-xs font-medium uppercase tracking-wider text-neutral-500">Map columns</h3>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {ROSTER_FIELDS.map((f) => (
              <Field key={f} name={f.replace(/_/g, " ")}>
                <select
                  value={mapping[f] ?? ""}
                  onChange={(e) =>
                    setMapping((m) => {
                      const next = { ...m };
                      if (e.target.value === "") delete next[f];
                      else next[f] = Number(e.target.value);
                      return next;
                    })
                  }
                  className={input}
                >
                  <option value="">—</option>
                  {headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h || `(column ${i + 1})`}
                    </option>
                  ))}
                </select>
              </Field>
            ))}
          </div>
          <button type="button" disabled={pending} className={ghostButton} onClick={previewRows}>
            Preview rows
          </button>
        </div>
      )}

      {rows && (
        <div className="space-y-3">
          <Table head={["Row", "Name", "Phone", "Stage", "Result", "Reason"]}>
            {rows.map((r) => (
              <tr key={r.row}>
                <td className={td}>{r.row}</td>
                <td className={td}>{r.name}</td>
                <td className={`${td} font-mono text-xs`}>{r.phoneMasked}</td>
                <td className={td}>{r.stage}</td>
                <td className={td}>
                  <Badge tone={r.status === "create" ? "good" : r.status === "rejected" ? "bad" : "amber"}>{r.status.replace("_", " ")}</Badge>
                </td>
                <td className={`${td} text-xs text-neutral-500`}>{r.reason}</td>
              </tr>
            ))}
          </Table>
          <button type="button" disabled={pending || !rows.some((r) => r.status === "create")} className={button} onClick={commit}>
            Create {rows.filter((r) => r.status === "create").length} leads
          </button>
        </div>
      )}
    </form>
  );
}
