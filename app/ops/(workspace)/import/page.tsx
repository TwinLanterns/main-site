// app/ops/(workspace)/import/page.tsx — leadership only.

import type { Metadata } from "next";
import { pageData } from "@/lib/ops/page";
import ImportWorkspace from "./ImportWorkspace";
import { Badge, Empty, PageHeader, Panel, fmtDate, fmtDateTime } from "../../_components/ui";

export const metadata: Metadata = { title: "Imports" };

export default async function ImportPage() {
  const data = await pageData();
  if (!data) return null;
  const { ws, project, actor } = data;
  if (actor.role !== "leadership") {
    return <Empty>Imports are limited to leadership.</Empty>;
  }
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date());

  return (
    <div className="space-y-5">
      <PageHeader title="Imports" sub={`Into ${project.code}. Manual CSV snapshots: nothing here syncs with Google Sheets.`} />
      <ImportWorkspace projectId={project.id} today={today} />

      <Panel title="Import history">
        {ws.imports.length === 0 ? (
          <Empty>No imports yet.</Empty>
        ) : (
          <ul className="space-y-3">
            {ws.imports.map((i) => (
              <li key={i.id} className="rounded-[14px] border border-line p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{i.kind === "roster" ? "Roster" : "Production"}</Badge>
                  <span className="text-neutral-900">{i.source_tab || i.source_filename}</span>
                  <span className="text-xs text-neutral-500">
                    {i.source_filename} · source as of {fmtDate(i.source_as_of)} · imported {fmtDateTime(i.imported_at)} by {i.actor_label}
                  </span>
                </div>
                <p className="mt-1 text-xs text-neutral-600">
                  {Object.entries(i.row_counts)
                    .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
                    .join(" · ")}
                </p>
                {i.discrepancies.length > 0 && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs text-amber">{i.discrepancies.length} sheet totals didn&apos;t match the rows</summary>
                    <ul className="mt-1 text-xs text-neutral-600">
                      {i.discrepancies.map((d) => (
                        <li key={d.scope}>
                          {d.scope}: sheet “{d.sourceRaw}” vs rows {d.recomputed}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
                {i.rejected_rows.length > 0 && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs text-red-300">{i.rejected_rows.length} rejected</summary>
                    <ul className="mt-1 text-xs text-neutral-600">
                      {i.rejected_rows.slice(0, 100).map((r, n) => (
                        <li key={n}>
                          Row {r.row}
                          {r.column && `, ${r.column}`}: {r.reason}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
