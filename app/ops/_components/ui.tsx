// app/ops/_components/ui.tsx
//
// Presentational pieces shared by /ops and /demo. Server-safe (no hooks).
// Uses the public site's own tokens and shapes (app/globals.css,
// components/form.tsx): `.label` mono eyebrows, pill buttons (white
// primary that warms to amber on hover), large-radius cards on `shell`,
// `line` hairlines. Amber is reserved for emphasis.

import type { ReactNode } from "react";

export const input =
  "w-full rounded-[12px] border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-muted/70 outline-none transition-colors focus:border-ink";
export const label = "label block";
export const button =
  "inline-flex items-center justify-center rounded-full bg-ink px-4 py-2 text-sm text-white transition-colors enabled:hover:bg-flame disabled:opacity-35 [&:not(button)]:hover:bg-flame";
export const ghostButton =
  "inline-flex items-center justify-center rounded-full border border-dim px-4 py-2 text-sm text-ink transition-colors hover:border-muted disabled:opacity-35";
/** /ops primary action: the workspace's one accent color. */
export const accentButton =
  "inline-flex h-9 items-center justify-center rounded-md bg-amber px-3.5 text-sm font-medium text-[#1b1407] transition-colors hover:bg-amber/85 disabled:opacity-40";
/** /ops secondary action on the gray ground. */
export const quietButton =
  "inline-flex h-9 items-center justify-center rounded-md border border-ops-line px-3 text-sm text-ink transition-colors hover:border-dim disabled:opacity-40";
export const th ="label px-3 py-2.5 text-left font-normal";
export const td = "px-3 py-2.5 align-top text-sm text-neutral-800";

type Tone = "neutral" | "amber" | "good" | "bad" | "info";
const tones: Record<Tone, string> = {
  neutral: "border-dim text-neutral-700",
  amber: "border-amber/40 bg-amber/10 text-amber",
  good: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  bad: "border-red-500/40 bg-red-500/10 text-red-300",
  info: "border-sky-500/40 bg-sky-500/10 text-sky-300",
};

export function Badge({ tone = "neutral", children, title }: { tone?: Tone; children: ReactNode; title?: string }) {
  return (
    <span title={title} className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function PageHeader({ title, sub, eyebrow, children }: { title: string; sub?: ReactNode; eyebrow?: string; children?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="label mb-3">{eyebrow}</p>}
        <h1 className="display text-4xl md:text-5xl">{title}</h1>
        {sub && <div className="mt-3 max-w-3xl text-[15px] text-muted">{sub}</div>}
      </div>
      {children}
    </div>
  );
}

export function Panel({ title, children, actions, className = "" }: { title?: ReactNode; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={`rounded-[22px] border border-line bg-shell ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5">
          {title && <h2 className="text-[15px] font-normal tracking-tight text-ink">{title}</h2>}
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-[18px] border border-dashed border-line px-4 py-6 text-center text-sm text-muted">{children}</p>;
}

export function Field({ name, children, className = "" }: { name: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className={label}>{name}</span>
      {children}
    </label>
  );
}

export function Table({ head, children, empty }: { head: string[]; children: ReactNode; empty?: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-[18px] border border-line">
      <table className="w-full min-w-max border-collapse">
        <thead className="bg-shell">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className={th}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
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
    <div className="flex flex-col rounded-[22px] border border-line bg-shell p-5">
      <div className="flex items-center justify-between gap-2">
        <span className={label}>{l}</span>
        {estimate && <Badge tone="info">Estimate</Badge>}
      </div>
      <div className={`display mt-3 text-3xl ${unknown ? "text-muted" : "text-ink"}`}>{value}</div>
      <p className="mt-2 text-xs text-muted">{completeness}</p>
      <details className="mt-3 text-xs text-neutral-600">
        <summary className="cursor-pointer select-none text-muted hover:text-ink">Definition</summary>
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
