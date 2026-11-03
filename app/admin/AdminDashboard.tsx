"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ShiftsAdmin from "./ShiftsAdmin";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type Row = Record<string, unknown>;

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

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

const DATA_REQUEST_COLUMNS = ["name", "email", "message", "created_at"];

const EARN_APPLICANT_COLUMNS = [
  "first_name",
  "last_name",
  "email",
  "phone",
  "location",
  "device_os",
  "device_model",
  "task_interests",
  "referred_by_display",
  "created_at",
];

const EARN_UNQUALIFIED_COLUMNS = [
  ...EARN_APPLICANT_COLUMNS.slice(0, -1),
  "disqualified_reasons",
  "created_at",
];

const EARN_GOPRO_COLUMNS = [
  "first_name",
  "last_name",
  "email",
  "phone",
  "location",
  "qualified",
  "disqualified_reasons",
  "referred_by",
  "created_at",
];

const EARN_SPEECH_COLUMNS = [
  "first_name",
  "last_name",
  "email",
  "phone",
  "age",
  "sex",
  "race_ethnicity",
  "accent",
  "region",
  "first_language_english",
  "qualified",
  "disqualified_reasons",
  "referred_by",
  "created_at",
];

const EARN_AMBASSADOR_COLUMNS = [
  "name",
  "email",
  "code",
  "qualified_referrals",
  "unqualified_referrals",
  "created_at",
];

/**
 * Keys that should NOT be surfaced as extra "short answer" columns in the
 * main table. These are either system/meta fields, or fields already shown
 * in the fixed `APPLICATION_COLUMNS` (in either schema's naming style).
 */
const SHORT_ANSWER_EXCLUDE = new Set([
  // System / meta
  "id",
  "created_at",
  "updated_at",
  "verification_token",
  "consent_given",
  "email_verified",
  "application_status",
  "source",
  "migrated_from",
  "original",
  // Already in fixed columns (both naming conventions)
  "first_name",
  "firstName",
  "last_name",
  "lastName",
  "email",
  "school",
  "university",
  "location",
  "grad_year",
  "gradYear",
  "graduation_year",
  "hours_per_week",
  "hours_available",
  "hours",
  "start_timing",
  "startWeeks",
  "start_date",
  "resume",
  "resume_name",
  "resume_url",
  "phone",
  "candidate_ai_tags",
  "raw_payload",
]);

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatCell(value: unknown) {
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value)) return value.join(", ") || "—";
  if (typeof value === "object") {
    try {
      const s = JSON.stringify(value);
      return s.length > 120 ? s.slice(0, 120) + "…" : s;
    } catch {
      return String(value);
    }
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value).toLocaleString();
  }
  return String(value);
}

function getAITags(row: Row): {
  vibe_tags: string[];
  soft_skills: string[];
  hard_skills: string[];
  ai_summary: string | null;
} | null {
  const raw = row.candidate_ai_tags;
  if (!raw) return null;
  if (Array.isArray(raw)) {
    return raw.length > 0 ? (raw[0] as any) : null;
  }
  return raw as any;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/* ------------------------------------------------------------------ */
/* Short answers                                                       */
/* ------------------------------------------------------------------ */

type SchemaKind = "current" | "legacy";

type ShortAnswer = {
  value: unknown;
  schema: SchemaKind;
};

/**
 * Extract "short answer" fields from a row's raw_payload.
 *
 * Two shapes are supported:
 *   - Current schema: `raw_payload` is a flat object of fields.
 *   - Legacy schema:  `raw_payload` = { original: {...}, migrated_from: "…" }
 *
 * Values that are null/undefined/empty are skipped so we don't render
 * columns that are effectively empty everywhere.
 */
function extractShortAnswers(row: Row): Map<string, ShortAnswer> {
  const out = new Map<string, ShortAnswer>();
  const raw = row.raw_payload;
  if (!isPlainObject(raw)) return out;

  // Legacy wrapper: dig into `.original`
  if (isPlainObject(raw.original)) {
    for (const [k, v] of Object.entries(raw.original)) {
      if (SHORT_ANSWER_EXCLUDE.has(k)) continue;
      if (v === null || v === undefined || v === "") continue;
      out.set(k, { value: v, schema: "legacy" });
    }
    return out;
  }

  // Current schema: raw_payload is flat
  for (const [k, v] of Object.entries(raw)) {
    if (SHORT_ANSWER_EXCLUDE.has(k)) continue;
    if (v === null || v === undefined || v === "") continue;
    out.set(k, { value: v, schema: "current" });
  }
  return out;
}

function SchemaBadge({ schemas }: { schemas: SchemaKind[] }) {
  const hasCurrent = schemas.includes("current");
  const hasLegacy = schemas.includes("legacy");

  if (hasCurrent && hasLegacy) {
    return (
      <span className="inline-flex items-center rounded-full bg-neutral-100 px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wider text-neutral-600 ring-1 ring-neutral-200">
        both
      </span>
    );
  }
  if (hasLegacy) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wider text-amber-700 ring-1 ring-amber-200">
        legacy
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-200">
      new
    </span>
  );
}

function ShortAnswerCell({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-neutral-300">—</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-neutral-300">—</span>;
    return (
      <div className="flex max-w-[220px] flex-wrap gap-1">
        {value.map((v, i) => (
          <span
            key={i}
            className="inline-flex items-center rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-700 ring-1 ring-neutral-200"
          >
            {typeof v === "object" ? JSON.stringify(v) : String(v)}
          </span>
        ))}
      </div>
    );
  }

  if (typeof value === "object") {
    let s: string;
    try {
      s = JSON.stringify(value);
    } catch {
      return <span className="text-[11px]">{String(value)}</span>;
    }
    const display = s.length > 80 ? s.slice(0, 80) + "…" : s;
    return (
      <span className="font-mono text-[10px] text-neutral-600" title={s}>
        {display}
      </span>
    );
  }

  const s = String(value);
  const display = s.length > 120 ? s.slice(0, 120) + "…" : s;
  return (
    <span
      className="block max-w-[220px] break-words text-[11px] leading-snug text-neutral-700"
      title={s}
    >
      {display}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Visual primitives                                                   */
/* ------------------------------------------------------------------ */

function VibeTags({ tags }: { tags: string[] | null | undefined }) {
  if (!tags || tags.length === 0)
    return <span className="text-xs text-neutral-400">—</span>;

  const colors = [
    "bg-blue-50 text-blue-700 ring-1 ring-blue-100",
    "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
    "bg-purple-50 text-purple-700 ring-1 ring-purple-100",
    "bg-amber-50 text-amber-800 ring-1 ring-amber-100",
    "bg-pink-50 text-pink-700 ring-1 ring-pink-100",
    "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100",
    "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100",
    "bg-rose-50 text-rose-700 ring-1 ring-rose-100",
  ];

  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag, i) => (
        <span
          key={tag}
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            colors[i % colors.length]
          }`}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Raw payload viewer                                                  */
/* ------------------------------------------------------------------ */

const KEY_ACRONYMS = new Set([
  "id",
  "ai",
  "url",
  "api",
  "sql",
  "crm",
  "irr",
  "apr",
  "ui",
  "ux",
  "pdf",
  "csv",
  "ip",
  "os",
  "hr",
]);

function humanizeKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) =>
      KEY_ACRONYMS.has(word.toLowerCase())
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

const URL_TLDS = "(com|org|io|net|edu|dev|co|app|ai|gov|me|info|biz|xyz|so)";

function isLikelyUrl(s: string): boolean {
  if (/\s/.test(s)) return false;
  if (/^https?:\/\//i.test(s)) return true;
  if (/^www\./i.test(s)) return true;
  return new RegExp(
    `^[\\w-]+(\\.[\\w-]+)*\\.${URL_TLDS}(\\/|$|\\?|#)`,
    "i",
  ).test(s);
}

function normalizeUrl(s: string): string {
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

function isIsoTimestamp(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s);
}

function isIsoDateOnly(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function ValueView({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-neutral-400 italic">—</span>;
  }

  if (typeof value === "boolean") {
    return value ? (
      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200">
        Yes
      </span>
    ) : (
      <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600 ring-1 ring-neutral-200">
        No
      </span>
    );
  }

  if (typeof value === "number") {
    return <span className="tabular-nums text-neutral-800">{value}</span>;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return <span className="text-neutral-400 italic">—</span>;
    }
    if (isIsoTimestamp(trimmed)) {
      return (
        <span className="text-neutral-800">
          {new Date(trimmed).toLocaleString()}
          <span className="ml-2 text-[11px] text-neutral-400">{trimmed}</span>
        </span>
      );
    }
    if (isIsoDateOnly(trimmed)) {
      return <span className="text-neutral-800">{trimmed}</span>;
    }
    if (isLikelyUrl(trimmed)) {
      return (
        <a
          href={normalizeUrl(trimmed)}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all text-blue-600 hover:text-blue-800 hover:underline"
        >
          {trimmed}
        </a>
      );
    }
    if (trimmed.length > 120 || trimmed.includes("\n")) {
      return (
        <p className="whitespace-pre-wrap break-words text-neutral-800">
          {trimmed}
        </p>
      );
    }
    return <span className="break-words text-neutral-800">{trimmed}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-neutral-400 italic">—</span>;
    }
    const allPrimitive = value.every(
      (v) =>
        v === null ||
        typeof v === "string" ||
        typeof v === "number" ||
        typeof v === "boolean",
    );
    if (allPrimitive) {
      return (
        <div className="flex flex-wrap gap-1">
          {value.map((v, i) => (
            <span
              key={i}
              className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700 ring-1 ring-neutral-200"
            >
              {v === null ? "—" : String(v)}
            </span>
          ))}
        </div>
      );
    }
    return (
      <div className="space-y-2">
        {value.map((v, i) => (
          <div
            key={i}
            className="rounded-lg border border-neutral-200 bg-white p-3"
          >
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-neutral-400">
              Item {i + 1}
            </p>
            <ValueView value={v} />
          </div>
        ))}
      </div>
    );
  }

  if (isPlainObject(value)) {
    return <ObjectView obj={value} />;
  }

  return <span className="text-neutral-800">{String(value)}</span>;
}

function ObjectView({ obj }: { obj: Record<string, unknown> }) {
  const entries = Object.entries(obj);
  if (entries.length === 0) {
    return <span className="text-neutral-400 italic">empty</span>;
  }
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-[minmax(140px,200px)_1fr]">
      {entries.map(([k, v]) => (
        <Fragment key={k}>
          <dt className="text-xs font-medium text-neutral-500 sm:pt-0.5">
            {humanizeKey(k)}
          </dt>
          <dd className="min-w-0 text-sm">
            <ValueView value={v} />
          </dd>
        </Fragment>
      ))}
    </dl>
  );
}

function RawPayloadView({ row }: { row: Row }) {
  const [showJson, setShowJson] = useState(false);

  const payload = row.raw_payload;

  let body: unknown = payload;
  let legacySource: string | null = null;
  let wrapperMeta: Record<string, unknown> | null = null;

  if (isPlainObject(payload) && isPlainObject(payload.original)) {
    body = payload.original;
    if (typeof payload.migrated_from === "string") {
      legacySource = payload.migrated_from;
    }
    const extras = Object.fromEntries(
      Object.entries(payload).filter(
        ([k]) => k !== "original" && k !== "migrated_from",
      ),
    );
    if (Object.keys(extras).length > 0) wrapperMeta = extras;
  }

  const json = useMemo(() => {
    try {
      return JSON.stringify(row, null, 2);
    } catch {
      return String(row);
    }
  }, [row]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {legacySource ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-800 ring-1 ring-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Legacy payload
            <span className="text-amber-500">·</span>
            migrated from {legacySource}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Current schema
          </span>
        )}

        <button
          onClick={() => setShowJson((s) => !s)}
          className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-[11px] font-medium text-neutral-600 transition-colors hover:border-neutral-300 hover:text-neutral-900"
        >
          {showJson ? "Pretty view" : "Raw JSON"}
        </button>
      </div>

      {showJson ? (
        <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap break-all rounded-lg border border-neutral-200 bg-white p-3 text-xs leading-relaxed text-neutral-700">
          {json}
        </pre>
      ) : (
        <>
          <section className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
            <header className="flex items-center gap-2 border-b border-neutral-100 bg-neutral-50/60 px-4 py-2">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                Raw payload
              </h4>
            </header>
            <div className="p-4">
              {body === null || body === undefined ? (
                <p className="text-sm italic text-neutral-400">
                  No raw payload recorded.
                </p>
              ) : isPlainObject(body) ? (
                <ObjectView obj={body} />
              ) : (
                <ValueView value={body} />
              )}
            </div>
          </section>

          {wrapperMeta && (
            <section className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
              <header className="flex items-center gap-2 border-b border-neutral-100 bg-neutral-50/60 px-4 py-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                  Migration metadata
                </h4>
              </header>
              <div className="p-4">
                <ObjectView obj={wrapperMeta} />
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Table                                                               */
/* ------------------------------------------------------------------ */

function Table({
  rows,
  columns,
  showResumeColumn = false,
  showAIColumns = false,
}: {
  rows: Row[];
  columns: string[];
  showResumeColumn?: boolean;
  showAIColumns?: boolean;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showShortAnswers, setShowShortAnswers] = useState(false);

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
  }, [rows, query]);

  /**
   * Discover every short-answer key that appears across all rows, and which
   * schema(s) it came from. Sorted alphabetically for stability.
   */
  const shortAnswerKeys = useMemo(() => {
    const schemas = new Map<string, Set<SchemaKind>>();
    for (const row of rows) {
      const answers = extractShortAnswers(row);
      for (const [k, v] of answers) {
        if (!schemas.has(k)) schemas.set(k, new Set());
        schemas.get(k)!.add(v.schema);
      }
    }
    return Array.from(schemas.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, schemaSet]) => ({
        key,
        schemas: Array.from(schemaSet) as SchemaKind[],
      }));
  }, [rows]);

  const totalCols =
    columns.length +
    (showAIColumns ? 4 : 0) +
    (showResumeColumn ? 1 : 0) +
    (showShortAnswers ? shortAnswerKeys.length : 0) +
    1;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full max-w-xs rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
        />
        {shortAnswerKeys.length > 0 && (
          <button
            onClick={() => setShowShortAnswers((s) => !s)}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
              showShortAnswers
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-300 bg-white text-neutral-600 hover:border-neutral-400 hover:text-neutral-900"
            }`}
          >
            {showShortAnswers ? "Hide" : "Show"} short answers (
            {shortAnswerKeys.length})
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="min-w-full divide-y divide-neutral-200 text-sm">
          <thead className="bg-neutral-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-3 py-2 text-left font-medium text-neutral-600"
                >
                  {col.replace(/_/g, " ")}
                </th>
              ))}
              {showAIColumns && (
                <>
                  <th className="px-3 py-2 text-left font-medium text-neutral-600">
                    vibe tags
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-neutral-600">
                    soft skills
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-neutral-600">
                    hard skills
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-neutral-600">
                    ai summary
                  </th>
                </>
              )}
              {showResumeColumn && (
                <th className="px-3 py-2 text-left font-medium text-neutral-600">
                  resume
                </th>
              )}
              {showShortAnswers &&
                shortAnswerKeys.map(({ key, schemas }) => (
                  <th
                    key={`sa-${key}`}
                    className="border-l border-neutral-100 bg-neutral-50/40 px-3 py-2 text-left align-bottom"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] font-medium text-neutral-700">
                        {key}
                      </span>
                      <SchemaBadge schemas={schemas} />
                    </div>
                  </th>
                ))}
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filtered.map((row) => {
              const id = String(row.id);
              const isExpanded = expandedId === id;
              const aiTags = getAITags(row);
              const shortAnswers = showShortAnswers
                ? extractShortAnswers(row)
                : null;

              return (
                <Fragment key={id}>
                  <tr className="hover:bg-neutral-50">
                    {columns.map((col) => (
                      <td
                        key={col}
                        className="whitespace-nowrap px-3 py-2 text-neutral-800"
                      >
                        {formatCell(row[col])}
                      </td>
                    ))}
                    {showAIColumns && (
                      <>
                        <td className="px-3 py-2">
                          <VibeTags tags={aiTags?.vibe_tags || null} />
                        </td>
                        <td className="px-3 py-2">
                          <VibeTags tags={aiTags?.soft_skills || null} />
                        </td>
                        <td className="px-3 py-2">
                          <VibeTags tags={aiTags?.hard_skills || null} />
                        </td>
                        <td className="max-w-xs px-3 py-2">
                          {aiTags?.ai_summary ? (
                            <span className="text-xs text-neutral-600">
                              {aiTags.ai_summary}
                            </span>
                          ) : (
                            <span className="text-xs text-neutral-400">—</span>
                          )}
                        </td>
                      </>
                    )}
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
                    {showShortAnswers &&
                      shortAnswerKeys.map(({ key }) => {
                        const sa = shortAnswers?.get(key);
                        return (
                          <td
                            key={`sa-${key}`}
                            className="border-l border-neutral-100 align-top px-3 py-2"
                          >
                            <ShortAnswerCell value={sa?.value} />
                          </td>
                        );
                      })}
                    <td className="px-3 py-2 text-right align-top">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : id)}
                        className="text-xs font-medium text-neutral-500 hover:text-neutral-900"
                      >
                        {isExpanded ? "Hide" : "View raw"}
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td
                        colSpan={totalCols}
                        className="bg-neutral-50 px-4 py-4"
                      >
                        <RawPayloadView row={row} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={totalCols}
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

/* ------------------------------------------------------------------ */
/* Earn — ambassadors + qualified/unqualified applicants             */
/* ------------------------------------------------------------------ */

/** code -> ambassador row, for quick lookups when annotating applicants. */
function buildAmbassadorMap(ambassadors: Row[]): Map<string, Row> {
  const map = new Map<string, Row>();
  for (const a of ambassadors) {
    const code = a.code;
    if (typeof code === "string") map.set(code, a);
  }
  return map;
}

/** Adds a human-readable `referred_by_display` column, e.g. "Jane Doe (AB12CD)". */
function withReferrerDisplay(rows: Row[], ambassadorMap: Map<string, Row>): Row[] {
  return rows.map((row) => {
    const code = row.referred_by_code;
    if (typeof code !== "string" || !code) {
      return { ...row, referred_by_display: "—" };
    }
    const ambassador = ambassadorMap.get(code);
    const name = ambassador?.name;
    return {
      ...row,
      referred_by_display:
        typeof name === "string" ? `${name} (${code})` : code,
    };
  });
}

/** Adds referral-count columns to the ambassador rows, e.g. for a leaderboard. */
function withReferralCounts(
  ambassadors: Row[],
  qualified: Row[],
  unqualified: Row[],
): Row[] {
  return ambassadors.map((a) => {
    const code = a.code;
    const qualified_referrals =
      typeof code === "string"
        ? qualified.filter((r) => r.referred_by_code === code).length
        : 0;
    const unqualified_referrals =
      typeof code === "string"
        ? unqualified.filter((r) => r.referred_by_code === code).length
        : 0;
    return { ...a, qualified_referrals, unqualified_referrals };
  });
}

type EarnSubTab = "qualified" | "unqualified" | "gopro" | "speech" | "ambassadors";

function EarnSection({
  ambassadors,
  qualified,
  unqualified,
  gopro,
  speech,
}: {
  ambassadors: Row[];
  qualified: Row[];
  unqualified: Row[];
  gopro: Row[];
  speech: Row[];
}) {
  const [subTab, setSubTab] = useState<EarnSubTab>("qualified");
  const [referrerFilter, setReferrerFilter] = useState<string>("");

  const ambassadorMap = useMemo(() => buildAmbassadorMap(ambassadors), [ambassadors]);

  const qualifiedWithReferrer = useMemo(
    () => withReferrerDisplay(qualified, ambassadorMap),
    [qualified, ambassadorMap],
  );
  const unqualifiedWithReferrer = useMemo(
    () => withReferrerDisplay(unqualified, ambassadorMap),
    [unqualified, ambassadorMap],
  );
  const ambassadorsWithCounts = useMemo(
    () => withReferralCounts(ambassadors, qualified, unqualified),
    [ambassadors, qualified, unqualified],
  );

  const filteredQualified = referrerFilter
    ? qualifiedWithReferrer.filter((r) => r.referred_by_code === referrerFilter)
    : qualifiedWithReferrer;
  const filteredUnqualified = referrerFilter
    ? unqualifiedWithReferrer.filter((r) => r.referred_by_code === referrerFilter)
    : unqualifiedWithReferrer;

  const selectedAmbassador = referrerFilter
    ? ambassadors.find((a) => a.code === referrerFilter)
    : null;

  const subTabs: { key: EarnSubTab; label: string; count: number }[] = [
    { key: "qualified", label: "Qualified", count: filteredQualified.length },
    { key: "unqualified", label: "Unqualified", count: filteredUnqualified.length },
    { key: "gopro", label: "GoPro", count: gopro.length },
    { key: "speech", label: "Speech", count: speech.length },
    { key: "ambassadors", label: "Ambassadors", count: ambassadors.length },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-neutral-200 bg-white p-0.5 shadow-sm">
          {subTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setSubTab(t.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                subTab === t.key
                  ? "bg-ink text-white"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        {subTab !== "ambassadors" && subTab !== "gopro" && subTab !== "speech" && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-neutral-500">
              Referred by
            </label>
            <select
              value={referrerFilter}
              onChange={(e) => setReferrerFilter(e.target.value)}
              className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
            >
              <option value="">All referrers</option>
              {ambassadors.map((a) => (
                <option key={String(a.code)} value={String(a.code)}>
                  {String(a.name)} — {String(a.code)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {selectedAmbassador && subTab !== "ambassadors" && subTab !== "gopro" && subTab !== "speech" && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2.5">
          <p className="text-sm text-neutral-700">
            Showing referrals from{" "}
            <span className="font-medium text-neutral-900">
              {String(selectedAmbassador.name)}
            </span>{" "}
            <span className="text-neutral-400">
              ({String(selectedAmbassador.code)})
            </span>
            {" · "}
            {filteredQualified.length} qualified ·{" "}
            {filteredUnqualified.length} unqualified
          </p>
          <button
            onClick={() => setReferrerFilter("")}
            className="text-xs font-medium text-neutral-500 hover:text-neutral-900"
          >
            Clear filter
          </button>
        </div>
      )}

      {subTab === "qualified" ? (
        <Table rows={filteredQualified} columns={EARN_APPLICANT_COLUMNS} />
      ) : subTab === "unqualified" ? (
        <Table rows={filteredUnqualified} columns={EARN_UNQUALIFIED_COLUMNS} />
      ) : subTab === "gopro" ? (
        <Table rows={gopro} columns={EARN_GOPRO_COLUMNS} />
      ) : subTab === "speech" ? (
        <Table rows={speech} columns={EARN_SPEECH_COLUMNS} />
      ) : (
        <Table rows={ambassadorsWithCounts} columns={EARN_AMBASSADOR_COLUMNS} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Job signups: every applicant across the three listings               */
/* ------------------------------------------------------------------ */

const JOB_SIGNUP_COLUMNS = [
  "role",
  "name",
  "email",
  "phone",
  "qualified",
  "referred_by",
  "created_at",
];

function JobSignups({
  filming,
  gopro,
  speech,
}: {
  filming: Row[];
  gopro: Row[];
  speech: Row[];
}) {
  const [role, setRole] = useState<string>("");

  const all = useMemo(() => {
    const tag = (rows: Row[], label: string, qualified?: boolean): Row[] =>
      rows.map((r) => ({
        ...r,
        role: label,
        name: [r.first_name, r.last_name].filter(Boolean).join(" "),
        qualified: qualified ?? r.qualified,
      }));
    return [
      ...tag(filming, "Task filmer"),
      ...tag(gopro, "GoPro home"),
      ...tag(speech, "Speech"),
    ].sort((a, b) =>
      String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")),
    );
  }, [filming, gopro, speech]);

  const [weekAgo] = useState(() => Date.now() - 7 * 24 * 60 * 60 * 1000);
  const roles = ["Task filmer", "GoPro home", "Speech"];
  const stats = roles.map((label) => {
    const rows = all.filter((r) => r.role === label);
    return {
      label,
      total: rows.length,
      week: rows.filter((r) => new Date(String(r.created_at)).getTime() > weekAgo)
        .length,
      qualified: rows.filter((r) => r.qualified === true).length,
    };
  });

  const shown = role ? all.filter((r) => r.role === role) : all;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <button
            key={s.label}
            onClick={() => setRole(role === s.label ? "" : s.label)}
            className={`rounded-lg border bg-white p-4 text-left transition-colors ${
              role === s.label
                ? "border-neutral-900"
                : "border-neutral-200 hover:border-neutral-400"
            }`}
          >
            <p className="text-xs font-medium text-neutral-500">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900">
              {s.total}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              +{s.week} this week · {s.qualified} qualified
            </p>
          </button>
        ))}
      </div>
      <Table rows={shown} columns={JOB_SIGNUP_COLUMNS} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dashboard shell                                                     */
/* ------------------------------------------------------------------ */

export default function AdminDashboard({
  applications,
  briefs,
  earnAmbassadors = [],
  earnQualified = [],
  earnUnqualified = [],
  earnGopro = [],
  earnSpeech = [],
  dataRequests = [],
  filmShifts = [],
  filmShiftCodes = [],
}: {
  applications: Row[];
  briefs: Row[];
  earnAmbassadors?: Row[];
  earnQualified?: Row[];
  earnUnqualified?: Row[];
  earnGopro?: Row[];
  earnSpeech?: Row[];
  dataRequests?: Row[];
  filmShifts?: Row[];
  filmShiftCodes?: Row[];
}) {
  const [tab, setTab] = useState<
    "jobs" | "applications" | "briefs" | "data" | "shifts" | "earn"
  >("jobs");
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    // pt clears the fixed site nav (3.5rem + iOS safe area), plus the old 2rem gap.
    <div className="min-h-screen bg-neutral-50 px-6 pb-8 pt-[calc(5.5rem+env(safe-area-inset-top,0px))]">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-neutral-900">
            Admin dashboard
          </h1>
          <div className="flex items-center gap-4">
            {/* The admin session also signs in to /ops (as leadership). */}
            <Link
              href="/ops"
              className="rounded-md bg-amber px-3 py-1.5 text-sm font-medium text-black transition-opacity hover:opacity-90"
            >
              Open Operations
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm text-neutral-500 hover:text-neutral-900"
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="flex gap-2 border-b border-neutral-200">
          <button
            onClick={() => setTab("jobs")}
            className={`px-3 py-2 text-sm font-medium ${
              tab === "jobs"
                ? "border-b-2 border-neutral-900 text-neutral-900"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Job signups ({earnQualified.length + earnUnqualified.length + earnGopro.length + earnSpeech.length})
          </button>
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
          <button
            onClick={() => setTab("data")}
            className={`px-3 py-2 text-sm font-medium ${
              tab === "data"
                ? "border-b-2 border-neutral-900 text-neutral-900"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Data requests ({dataRequests.length})
          </button>
          <button
            onClick={() => setTab("shifts")}
            className={`px-3 py-2 text-sm font-medium ${
              tab === "shifts"
                ? "border-b-2 border-neutral-900 text-neutral-900"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Shifts ({filmShifts.length})
          </button>
          <button
            onClick={() => setTab("earn")}
            className={`px-3 py-2 text-sm font-medium ${
              tab === "earn"
                ? "border-b-2 border-neutral-900 text-neutral-900"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Earn ({earnQualified.length + earnUnqualified.length + earnGopro.length + earnSpeech.length})
          </button>
        </div>

        {tab === "jobs" ? (
          <JobSignups
            filming={[...earnQualified, ...earnUnqualified].map((r) => ({
              ...r,
              qualified: earnQualified.includes(r),
            }))}
            gopro={earnGopro}
            speech={earnSpeech}
          />
        ) : tab === "applications" ? (
          <Table
            rows={applications}
            columns={APPLICATION_COLUMNS}
            showResumeColumn
            showAIColumns
          />
        ) : tab === "briefs" ? (
          <Table rows={briefs} columns={BRIEF_COLUMNS} />
        ) : tab === "data" ? (
          <Table rows={dataRequests} columns={DATA_REQUEST_COLUMNS} />
        ) : tab === "shifts" ? (
          <ShiftsAdmin shifts={filmShifts} codes={filmShiftCodes} />
        ) : (
          <EarnSection
            ambassadors={earnAmbassadors}
            qualified={earnQualified}
            unqualified={earnUnqualified}
            gopro={earnGopro}
            speech={earnSpeech}
          />
        )}
      </div>
    </div>
  );
}