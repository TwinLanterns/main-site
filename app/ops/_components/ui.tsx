// app/ops/_components/ui.tsx
//
// Presentational pieces shared by /ops and /demo. Server-safe (no hooks).
// Colors follow app/globals.css: dark ground, flipped neutral scale, amber
// only for emphasis.

import type { ReactNode } from "react";

export const input =
  "w-full rounded-md border border-neutral-300 bg-neutral-50 px-2.5 py-1.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-amber focus:outline-none";
export const label = "block text-[11px] font-medium uppercase tracking-wider text-neutral-500";
export const button =
  "inline-flex items-center justify-center rounded-md bg-amber px-3 py-1.5 text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50";
export const ghostButton =
  "inline-flex items-center justify-center rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-800 transition-colors hover:border-neutral-500 disabled:opacity-50";
export const th = "px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-neutral-500";
export const td = "px-3 py-2 align-top text-sm text-neutral-800";

type Tone = "neutral" | "amber" | "good" | "bad" | "info";
const tones: Record<Tone, string> = {
  neutral: "border-neutral-300 text-neutral-700",
  amber: "border-amber/40 bg-amber/10 text-amber",
  good: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  bad: "border-red-500/40 bg-red-500/10 text-red-300",
  info: "border-sky-500/40 bg-sky-500/10 text-sky-300",
};

export function Badge({ tone = "neutral", children, title }: { tone?: Tone; children: ReactNode; title?: string }) {
  return (
    <span title={title} className={`inline-flex items-center whitespace-nowrap rounded border px-1.5 py-0.5 text-[11px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function PageHeader({ title, sub, children }: { title: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-light tracking-tight text-neutral-900">{title}</h1>
        {sub && <div className="mt-1 text-sm text-neutral-500">{sub}</div>}
      </div>
      {children}
    </div>
  );
}

export function Panel({ title, children, actions, className = "" }: { title?: ReactNode; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-neutral-200 bg-neutral-50 ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 px-4 py-2.5">
          {title && <h2 className="text-sm font-medium text-neutral-900">{title}</h2>}
          {actions}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-md border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-500">{children}</p>;
}

export function Field({ name, children, className = "" }: { name: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block space-y-1 ${className}`}>
      <span className={label}>{name}</span>
      {children}
    </label>
  );
}

export function Table({ head, children, empty }: { head: string[]; children: ReactNode; empty?: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-md border border-neutral-200">
      <table className="w-full min-w-max border-collapse">
        <thead className="bg-neutral-100">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className={th}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">{children}</tbody>
      </table>
      {empty}
    </div>
  );
}

export function StatCard({
  label: l,
  value,
  unknown,
  estimate,
  definition,
  completeness,
}: {
  label: string;
  value: string;
  unknown?: boolean;
  estimate?: boolean;
  definition: string;
  completeness: string;
}) {
  return (
    <div className="flex flex-col rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className={label}>{l}</span>
        {estimate && <Badge tone="info">Estimate</Badge>}
      </div>
      <div className={`mt-2 text-2xl font-light ${unknown ? "text-neutral-500" : "text-neutral-900"}`}>{value}</div>
      <p className="mt-1 text-xs text-neutral-500">{completeness}</p>
      <details className="mt-3 text-xs text-neutral-600">
        <summary className="cursor-pointer select-none text-neutral-500 hover:text-neutral-800">Definition</summary>
        <p className="mt-1">{definition}</p>
      </details>
    </div>
  );
}

export function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = iso.length === 10 ? new Date(`${iso}T12:00:00Z`) : new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Los_Angeles" });
}

export function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return `${new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles" })} PT`;
}

/** Today in Pacific time, YYYY-MM-DD. */
export function todayPT() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date());
}

/** Calendar day of an instant in Pacific time, YYYY-MM-DD. */
export function ptDay(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date(iso));
}
