"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Row = Record<string, unknown>;

const APPLICATION_COLUMNS = [
  "first_name",
  "last_name",
  "email",
  "school",
  "grad_year",
  "location",
  "hours_per_week",
  "start_timing",
  "created_at",
];

const BRIEF_COLUMNS = [
  "company",
  "contact_name",
  "contact_email",
  "title",
  "stage",
  "city",
  "timeline",
  "created_at",
];

function formatCell(value: unknown) {
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value)) return value.join(", ") || "—";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value).toLocaleString();
  }
  return String(value);
}

// Long strings (e.g. a stray base64 blob) get truncated in the raw-JSON
// view so one giant field doesn't make the whole row unreadable.
function redactLongStrings(row: Row): Row {
  const out: Row = {};
  for (const [key, value] of Object.entries(row)) {
    if (typeof value === "string" && value.length > 300) {
      out[key] = `${value.slice(0, 120)}… [truncated, ${value.length} chars total]`;
    } else {
      out[key] = value;
    }
  }
  return out;
}

function Table({
  rows,
  columns,
  showResumeColumn = false,
}: {
  rows: Row[];
  columns: string[];
  showResumeColumn?: boolean;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
  }, [rows, query]);

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="Search…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full max-w-xs rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
      />

      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="min-w-full divide-y divide-neutral-200 text-sm">
          <thead className="bg-neutral-50">
            <tr>
              {columns.map((col) => (
                <th key={col} className="px-3 py-2 text-left font-medium text-neutral-600">
                  {col.replace(/_/g, " ")}
                </th>
              ))}
              {showResumeColumn && <th className="px-3 py-2 text-left font-medium text-neutral-600">resume</th>}
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filtered.map((row) => {
              const id = String(row.id);
              const isExpanded = expandedId === id;
              return (
                <>
                  <tr key={id} className="hover:bg-neutral-50">
                    {columns.map((col) => (
                      <td key={col} className="whitespace-nowrap px-3 py-2 text-neutral-800">
                        {formatCell(row[col])}
                      </td>
                    ))}
                    {showResumeColumn && (
                      <td className="whitespace-nowrap px-3 py-2">
                        {row.resume_name ? (
                          <a
                            href={`/api/admin/resume/${id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-blue-600 hover:underline"
                          >
                            Download
                          </a>
                        ) : (
                          <span className="text-xs text-neutral-400">—</span>
                        )}
                      </td>
                    )}
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : id)}
                        className="text-xs font-medium text-neutral-500 hover:text-neutral-900"
                      >
                        {isExpanded ? "Hide" : "View raw"}
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${id}-raw`}>
                      <td
                        colSpan={columns.length + (showResumeColumn ? 2 : 1)}
                        className="bg-neutral-50 px-3 py-3"
                      >
                        <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-all text-xs text-neutral-700">
                          {JSON.stringify(redactLongStrings(row), null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + (showResumeColumn ? 2 : 1)}
                  className="px-3 py-6 text-center text-neutral-400"
                >
                  No rows.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-neutral-400">
        {filtered.length} of {rows.length} rows
      </p>
    </div>
  );
}

export default function AdminDashboard({
  applications,
  briefs,
}: {
  applications: Row[];
  briefs: Row[];
}) {
  const [tab, setTab] = useState<"applications" | "briefs">("applications");
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-neutral-50 px-6 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-neutral-900">Admin dashboard</h1>
          <button
            onClick={handleLogout}
            className="text-sm text-neutral-500 hover:text-neutral-900"
          >
            Sign out
          </button>
        </div>

        <div className="flex gap-2 border-b border-neutral-200">
          <button
            onClick={() => setTab("applications")}
            className={`px-3 py-2 text-sm font-medium ${
              tab === "applications"
                ? "border-b-2 border-neutral-900 text-neutral-900"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Student applications ({applications.length})
          </button>
          <button
            onClick={() => setTab("briefs")}
            className={`px-3 py-2 text-sm font-medium ${
              tab === "briefs"
                ? "border-b-2 border-neutral-900 text-neutral-900"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Company briefs ({briefs.length})
          </button>
        </div>

        {tab === "applications" ? (
          <Table rows={applications} columns={APPLICATION_COLUMNS} showResumeColumn />
        ) : (
          <Table rows={briefs} columns={BRIEF_COLUMNS} />
        )}
      </div>
    </div>
  );
}