// app/ops/(workspace)/forecast/page.tsx

import type { Metadata } from "next";
import Link from "next/link";
import { pageData } from "@/lib/ops/page";
import { forecastInputs, productionFor } from "@/lib/ops/derive";
import { forecastScenario } from "@/lib/ops/forecast";
import { formatHours } from "@/lib/ops/duration";
import { Badge, Empty, PageHeader, Panel, Table, fmtDate, ghostButton, td } from "../../_components/ui";

export const metadata: Metadata = { title: "Production Forecasts" };

export default async function ForecastPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const data = await pageData();
  if (!data) return null;
  const { ws, project } = data;
  const sp = await searchParams;
  const opts = { includePipeline: sp.pipeline === "1", includePaused: sp.paused === "1" };
  const inputs = forecastInputs(ws.enrollments, ws.production, ws.assumptions);
  const scenario = forecastScenario(inputs, opts);
  const recordedToDate = scenario.rows.filter((r) => r.included).reduce((s, r) => s + r.input.recordedToDateSeconds, 0);

  // Only add actuals + forecast when no included horizon overlaps dates
  // that already have workbook production for that operator.
  const overlaps = scenario.rows.some((r) => {
    if (!r.included || !r.input.horizon) return false;
    const e = ws.enrollments.find((x) => x.id === r.input.enrollmentId)!;
    const lastDate = productionFor(e, ws.production).reduce((m, p) => (p.calendar_date > m ? p.calendar_date : m), "");
    return lastDate !== "" && r.input.horizon.start <= lastDate;
  });

  const toggle = (k: "pipeline" | "paused") => {
    const p = new URLSearchParams();
    if (k === "pipeline" ? !opts.includePipeline : opts.includePipeline) p.set("pipeline", "1");
    if (k === "paused" ? !opts.includePaused : opts.includePaused) p.set("paused", "1");
    return `/ops/forecast${p.size ? `?${p}` : ""}`;
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Production Forecasts" sub={`${project.name}. Estimates use explicit, per-operator inputs and are kept apart from recorded and accepted output.`} />

      <Panel title="How each estimate is calculated">
        <ol className="list-decimal space-y-1 pl-5 text-sm text-neutral-700">
          <li>
            <strong className="font-medium">capacity</strong> = daily recording hours × remaining recording days in the horizon
          </li>
          <li>
            If a documented target exists: <strong className="font-medium">remaining target</strong> = max(0, target − submitted to date), and the forecast = min(capacity, remaining target). Otherwise the forecast = capacity.
          </li>
          <li>An approved estimate is shown only when an acceptance rate has been supplied for every included operator. No rate is applied by default.</li>
        </ol>
        <p className="mt-3 text-xs text-neutral-500">
          “Submitted to date” is the workbook&apos;s submitted duration. Withdrawn and completed operators are always excluded. Paused operators and not-yet-activated leads are excluded unless you include them, and that scenario is labelled.
        </p>
      </Panel>

      <div className="flex flex-wrap items-center gap-2">
        <Link href={toggle("pipeline")} className={`${ghostButton} ${opts.includePipeline ? "border-amber" : ""}`} aria-pressed={opts.includePipeline}>
          {opts.includePipeline ? "✓ " : ""}Include pipeline (not yet activated)
        </Link>
        <Link href={toggle("paused")} className={`${ghostButton} ${opts.includePaused ? "border-amber" : ""}`} aria-pressed={opts.includePaused}>
          {opts.includePaused ? "✓ " : ""}Include paused
        </Link>
        <Badge tone={opts.includePipeline || opts.includePaused ? "amber" : "neutral"}>{scenario.label}</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Panel title="Forecast remaining (recorded)">
          <p className="text-2xl font-light">{scenario.includedCount ? formatHours(scenario.forecastRecordedSeconds) : "—"}</p>
          <p className="text-xs text-neutral-500">
            <Badge tone="info">Estimate</Badge> {scenario.includedCount} operators included
          </p>
        </Panel>
        <Panel title="Forecast approved">
          <p className="text-2xl font-light">{scenario.forecastApprovedSeconds !== null ? formatHours(scenario.forecastApprovedSeconds) : "Not estimated"}</p>
          <p className="text-xs text-neutral-500">Needs a supported acceptance rate for every included operator.</p>
        </Panel>
        <Panel title="Submitted to date + forecast">
          {overlaps || !scenario.includedCount ? (
            <p className="text-sm text-neutral-500">
              {scenario.includedCount ? "Not combined: a forecast horizon overlaps dates that already have production." : "—"}
            </p>
          ) : (
            <>
              <p className="text-2xl font-light">{formatHours(recordedToDate + scenario.forecastRecordedSeconds)}</p>
              <p className="text-xs text-neutral-500">
                {formatHours(recordedToDate)} submitted + {formatHours(scenario.forecastRecordedSeconds)} estimated
              </p>
            </>
          )}
        </Panel>
      </div>

      {scenario.rows.length === 0 ? (
        <Empty>No operators on this project yet.</Empty>
      ) : (
        <Table head={["Operator", "Bucket", "Submitted to date", "Target", "Remaining target", "Rate × days", "Capacity", "Forecast", "Accept. rate", "Forecast approved", "Horizon", "Source", "Note"]}>
          {scenario.rows.map((r) => (
            <tr key={r.input.enrollmentId} className={r.included ? "" : "opacity-60"}>
              <td className={td}>
                <Link href={`/ops/operators/${r.input.enrollmentId}`} className="font-mono underline-offset-2 hover:underline">
                  {r.input.code}
                </Link>
              </td>
              <td className={td}>
                <Badge tone={r.bucket === "committed" ? "good" : r.bucket === "excluded" ? "neutral" : "amber"}>{r.bucket}</Badge>
              </td>
              <td className={td}>{formatHours(r.input.recordedToDateSeconds)}</td>
              <td className={td}>{r.input.targetSeconds === null ? "None documented" : formatHours(r.input.targetSeconds)}</td>
              <td className={td}>{formatHours(r.remainingTargetSeconds)}</td>
              <td className={td}>{r.input.dailySeconds !== null ? `${formatHours(r.input.dailySeconds)} × ${r.input.remainingDays}` : "—"}</td>
              <td className={td}>{formatHours(r.capacitySeconds)}</td>
              <td className={`${td} text-neutral-900`}>{formatHours(r.forecastRecordedSeconds)}</td>
              <td className={td}>{r.input.acceptanceRate ?? "—"}</td>
              <td className={td}>{formatHours(r.forecastApprovedSeconds)}</td>
              <td className={td}>{r.input.horizon ? `${fmtDate(r.input.horizon.start)} – ${fmtDate(r.input.horizon.end)}` : "—"}</td>
              <td className={`${td} max-w-48 whitespace-normal text-xs`}>{r.input.assumptionSource || "—"}</td>
              <td className={`${td} max-w-64 whitespace-normal text-xs text-neutral-500`}>{r.reason}</td>
            </tr>
          ))}
        </Table>
      )}
      <p className="text-xs text-neutral-500">Edit an operator&apos;s assumption on their operator page. Hours are rounded for display only; values are stored in seconds.</p>
    </div>
  );
}
