"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type Row = Record<string, unknown>;

type MatchDetail = {
  word: string;
  source: "tags" | "summary" | "raw_payload";
  field?: string;
  excerpt?: string;
};

type SearchCandidate = {
  id: string;
  first_name: string;
  last_name?: string | null;
  email: string;
  school?: string | null;
  location?: string | null;
  vibe_tags?: string[];
  soft_skills?: string[];
  hard_skills?: string[];
  ai_summary?: string;
  snippet?: string;
  matched_keywords?: string[];
  match_details?: MatchDetail[];
  deep_analysis?: string;
  match_score?: number;
  match_reason?: string;
};

type SearchStage =
  "initializing" | "filtering" | "analyzing" | "ranking" | "complete";

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

const EXAMPLE_PROMPTS = [
  "Scrappy self-starter who's shipped side projects",
  "Data-driven analyst with Python and SQL",
  "Designer with a strong visual portfolio",
  "Backend engineer who's worked in fintech",
];

const SOURCE_META: Record<
  MatchDetail["source"],
  { label: string; chip: string; dot: string }
> = {
  tags: {
    label: "tag",
    chip: "bg-purple-50 text-purple-700 ring-1 ring-purple-200",
    dot: "bg-purple-500",
  },
  summary: {
    label: "summary",
    chip: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
    dot: "bg-sky-500",
  },
  raw_payload: {
    label: "profile",
    chip: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
    dot: "bg-amber-500",
  },
};

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

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Defensive client-side strip in case a provider leaks reasoning tags. */
function stripThinking(text?: string): string {
  if (!text) return "";
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  if (cleaned.includes("<think>")) cleaned = cleaned.split("<think>")[0].trim();
  return cleaned;
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

function HighlightedSnippet({
  snippet,
  keywords,
}: {
  snippet: string;
  keywords: string[];
}) {
  if (!snippet) return null;
  const valid = (keywords || []).filter((k) => k && k.length >= 2);
  if (valid.length === 0) {
    return (
      <p className="mt-2 text-sm text-neutral-700 leading-relaxed">{snippet}</p>
    );
  }

  const pattern = valid.map(escapeRegExp).join("|");
  const regex = new RegExp(`(${pattern})`, "gi");
  const parts = snippet.split(regex); // odd indexes = matches

  return (
    <p className="mt-2 text-sm text-neutral-700 leading-relaxed">
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark
            key={i}
            className="bg-lemon/60 text-ink rounded px-0.5 font-medium"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </p>
  );
}

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

function MatchedKeywords({
  keywords,
  matchDetails,
}: {
  keywords?: string[] | null;
  matchDetails?: MatchDetail[] | null;
}) {
  if (!keywords || keywords.length === 0) return null;

  const sourcesByWord = new Map<string, Set<MatchDetail["source"]>>();
  (matchDetails || []).forEach((m) => {
    if (!m || !m.word) return;
    if (!sourcesByWord.has(m.word)) sourcesByWord.set(m.word, new Set());
    sourcesByWord.get(m.word)!.add(m.source);
  });

  const tagEvidence = (matchDetails || []).filter(
    (m) => m.source === "tags" && m.excerpt,
  );
  const rawEvidence = (matchDetails || []).filter(
    (m) => m.source === "raw_payload" && m.excerpt,
  );

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wider text-neutral-400 mr-0.5">
          Matched
        </span>
        {keywords.map((kw) => {
          const sources: MatchDetail["source"][] = Array.from(
            sourcesByWord.get(kw) || (["tags"] as MatchDetail["source"][]),
          );
          const primary = sources[0] as MatchDetail["source"];
          const meta = SOURCE_META[primary];
          return (
            <span
              key={kw}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.chip}`}
            >
              <span className="flex -space-x-0.5">
                {sources.map((s) => (
                  <span
                    key={s}
                    className={`h-1.5 w-1.5 rounded-full ${SOURCE_META[s].dot}`}
                    title={SOURCE_META[s].label}
                  />
                ))}
              </span>
              {kw}
            </span>
          );
        })}
      </div>

      {(tagEvidence.length > 0 || rawEvidence.length > 0) && (
        <div className="space-y-1 pl-1">
          {tagEvidence.slice(0, 3).map((m, i) => (
            <p key={`t-${i}`} className="text-xs text-neutral-500 leading-snug">
              <span className="text-purple-600 font-medium">
                {m.field || "tag"}
              </span>
              <span className="text-neutral-400"> · </span>
              <mark className="bg-purple-100/70 text-neutral-700 rounded px-1">
                {m.excerpt}
              </mark>
            </p>
          ))}
          {rawEvidence.slice(0, 3).map((m, i) => (
            <p key={`r-${i}`} className="text-xs text-neutral-500 leading-snug">
              <span className="text-amber-700 font-medium">
                {m.field || "raw_payload"}
              </span>
              <span className="text-neutral-400"> · </span>
              <mark className="bg-amber-100/70 text-neutral-700 rounded px-1">
                {m.excerpt}
              </mark>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const color =
    clamped >= 80
      ? "#16a34a"
      : clamped >= 60
        ? "#65a30d"
        : clamped >= 40
          ? "#ca8a04"
          : "#dc2626";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e5e5"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-semibold text-neutral-900 leading-none">
          {clamped}
        </span>
        <span className="text-[9px] uppercase tracking-wider text-neutral-400 leading-none mt-0.5">
          match
        </span>
      </div>
    </div>
  );
}

function CandidateCard({
  candidate,
  index,
  mode,
}: {
  candidate: SearchCandidate;
  index: number;
  mode: "shortlist" | "final";
}) {
  const isFinal = mode === "final";
  const matchedKeywords = candidate.matched_keywords || [];
  const matchDetails = candidate.match_details || [];
  const analysis = stripThinking(candidate.deep_analysis);
  const reason = stripThinking(candidate.match_reason);

  const rankBadgeClass =
    isFinal && index === 0
      ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-sm"
      : isFinal && index === 1
        ? "bg-gradient-to-br from-neutral-300 to-neutral-500 text-white shadow-sm"
        : isFinal && index === 2
          ? "bg-gradient-to-br from-orange-400 to-orange-700 text-white shadow-sm"
          : "bg-ink text-white";

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md animate-slide-in">
      <span
        className={`absolute inset-x-0 top-0 h-0.5 ${
          isFinal
            ? "bg-gradient-to-r from-emerald-400 via-green-500 to-teal-500"
            : "bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500"
        }`}
      />

      <div className="flex items-start gap-4">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${rankBadgeClass}`}
        >
          {index + 1}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h3 className="text-base font-semibold text-ink truncate">
              {candidate.first_name} {candidate.last_name || ""}
            </h3>
            {isFinal && !candidate.match_score && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 ring-1 ring-blue-100">
                Shortlisted
              </span>
            )}
          </div>

          <p className="mt-0.5 text-xs text-neutral-500 truncate">
            {candidate.email}
            {candidate.school ? <> · {candidate.school}</> : null}
            {candidate.location ? <> · {candidate.location}</> : null}
          </p>

          {candidate.vibe_tags && candidate.vibe_tags.length > 0 && (
            <div className="mt-2.5">
              <VibeTags tags={candidate.vibe_tags} />
            </div>
          )}

          <HighlightedSnippet
            snippet={candidate.snippet || ""}
            keywords={matchedKeywords}
          />

          <MatchedKeywords
            keywords={matchedKeywords}
            matchDetails={matchDetails}
          />

          {reason && (
            <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wider text-emerald-700 font-medium">
                Why this match
              </p>
              <p className="mt-0.5 text-sm text-emerald-900 leading-snug">
                {reason}
              </p>
            </div>
          )}

          {analysis && (
            <p className="mt-2 text-xs text-neutral-500 leading-snug">
              {analysis}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          {isFinal && typeof candidate.match_score === "number" && (
            <ScoreRing score={candidate.match_score} />
          )}
          <a
            href={`/api/admin/resume/${candidate.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline whitespace-nowrap"
          >
            Resume ↗
          </a>
        </div>
      </div>
    </article>
  );
}

function Stepper({ stage }: { stage: SearchStage }) {
  const steps = [
    { key: "initializing", label: "Initializing" },
    { key: "filtering", label: "Shortlisting" },
    { key: "analyzing", label: "Analyzing" },
    { key: "ranking", label: "Ranking" },
  ] as const;

  const currentIndex =
    stage === "complete"
      ? steps.length
      : Math.max(
          0,
          steps.findIndex((s) => s.key === stage),
        );

  return (
    <div className="flex flex-wrap items-center gap-3">
      {steps.map((s, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <Fragment key={s.key}>
            <div className="flex items-center gap-2">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold transition-all ${
                  done
                    ? "bg-emerald-500 text-white"
                    : active
                      ? "bg-blue-500 text-white animate-pulse"
                      : "bg-neutral-200 text-neutral-500"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              <span
                className={`text-xs transition-colors ${
                  active
                    ? "text-neutral-900 font-medium"
                    : done
                      ? "text-neutral-600"
                      : "text-neutral-400"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <span
                className={`hidden sm:block h-px w-5 ${
                  done ? "bg-emerald-400" : "bg-neutral-200"
                }`}
              />
            )}
          </Fragment>
        );
      })}
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
/* VibeSearch                                                          */
/* ------------------------------------------------------------------ */

function VibeSearch() {
  const [vibePrompt, setVibePrompt] = useState("");
  const [results, setResults] = useState<SearchCandidate[] | null>(null);
  const [shortlist, setShortlist] = useState<SearchCandidate[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<SearchStage>("initializing");
  const [currentMessage, setCurrentMessage] = useState<string>("");
  const [viewMode, setViewMode] = useState<"shortlist" | "final">("shortlist");
  const [isTransitioning, setIsTransitioning] = useState(false);

  async function handleVibeSearch() {
    if (!vibePrompt.trim()) return;

    setIsSearching(true);
    setError(null);
    setResults(null);
    setShortlist(null);
    setStage("initializing");
    setCurrentMessage("Initializing search…");
    setViewMode("shortlist");
    setIsTransitioning(false);

    try {
      const response = await fetch("/api/admin/vibe-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: vibePrompt }),
      });

      const contentType = response.headers.get("Content-Type") || "";

      if (contentType.includes("text/event-stream")) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) throw new Error("Failed to read response stream");

        let buffer = "";
        let receivedResult = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;

            let data: any;
            try {
              data = JSON.parse(line.slice(6));
            } catch {
              continue;
            }

            if (data.type === "error") {
              throw new Error(data.error || "Search failed");
            }

            if (data.type === "stage") {
              setStage(data.stage);
              if (data.message) setCurrentMessage(data.message);
              if (data.shortlist) setShortlist(data.shortlist);
            } else if (data.type === "result") {
              setResults(data.results || []);
              if (data.shortlist) setShortlist(data.shortlist);
              setStage("complete");
              receivedResult = true;
            }
          }
        }

        if (!receivedResult) {
          throw new Error("Search stream ended without a result.");
        }
      } else {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Search failed");
        setResults(data.results || []);
        if (data.shortlist) setShortlist(data.shortlist);
        setStage("complete");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsSearching(false);
    }
  }

  const handleViewTransition = (next: "shortlist" | "final") => {
    if (next === viewMode) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setViewMode(next);
      setIsTransitioning(false);
    }, 400);
  };

  const displayedCandidates: SearchCandidate[] =
    viewMode === "shortlist" ? shortlist || results || [] : results || [];

  const progressPct =
    stage === "complete"
      ? 100
      : stage === "initializing"
        ? 10
        : stage === "filtering"
          ? 35
          : stage === "analyzing"
            ? 65
            : stage === "ranking"
              ? 90
              : 0;

  const hasSearched = !!results || !!shortlist;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
              🔎
            </span>
            <input
              type="text"
              placeholder="Describe your ideal candidate…"
              value={vibePrompt}
              onChange={(e) => setVibePrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleVibeSearch()}
              disabled={isSearching}
              className="w-full rounded-xl border border-neutral-300 bg-neutral-50/40 pl-9 pr-3 py-2.5 text-sm placeholder:text-neutral-400 focus:border-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-ink/10 disabled:opacity-60"
            />
          </div>
          <button
            onClick={handleVibeSearch}
            disabled={!vibePrompt.trim() || isSearching}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-ink px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSearching ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Searching…
              </>
            ) : (
              <>Semantic Search</>
            )}
          </button>
        </div>

        {!hasSearched && !isSearching && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] uppercase tracking-wider text-neutral-400 mr-1">
              Try
            </span>
            {EXAMPLE_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => setVibePrompt(p)}
                className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs text-neutral-600 transition-colors hover:border-neutral-300 hover:bg-white hover:text-neutral-900"
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {isSearching && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <Stepper stage={stage} />
          <p className="mt-3 text-sm text-neutral-600">
            {currentMessage || "Working…"}
          </p>
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-700 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">Search failed</p>
          <p className="mt-0.5 text-sm text-red-700">{error}</p>
          <button
            onClick={handleVibeSearch}
            className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      )}

      {!isSearching &&
        !error &&
        hasSearched &&
        displayedCandidates.length === 0 && (
          <div className="rounded-2xl border border-neutral-200 bg-white p-10 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-lg">
              🕳️
            </div>
            <p className="mt-3 text-sm font-medium text-neutral-700">
              No matching candidates
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Try broader keywords or a different vibe.
            </p>
          </div>
        )}

      {displayedCandidates.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-neutral-800">
                {viewMode === "shortlist"
                  ? `Shortlist · ${displayedCandidates.length} candidate${
                      displayedCandidates.length === 1 ? "" : "s"
                    }`
                  : `Final ranking · top ${displayedCandidates.length}`}
              </p>
              <p className="text-xs text-neutral-500">
                for <span className="text-neutral-700">“{vibePrompt}”</span>
              </p>
            </div>

            {results && results.length > 0 && (
              <div className="inline-flex rounded-full border border-neutral-200 bg-white p-0.5 shadow-sm">
                <button
                  onClick={() => handleViewTransition("shortlist")}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    viewMode === "shortlist"
                      ? "bg-ink text-white"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  Shortlist
                </button>
                <button
                  onClick={() => handleViewTransition("final")}
                  className={`relative rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    viewMode === "final"
                      ? "bg-ink text-white"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  Final rankings
                  {viewMode === "shortlist" && (
                    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                  )}
                </button>
              </div>
            )}
          </div>

          <div
            className={`space-y-3 transition-all duration-500 ${
              isTransitioning
                ? "opacity-0 translate-y-2"
                : "opacity-100 translate-y-0"
            }`}
          >
            {displayedCandidates.map((candidate, index) => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                index={index}
                mode={viewMode}
              />
            ))}
          </div>
        </div>
      )}
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
}: {
  applications: Row[];
  briefs: Row[];
  earnAmbassadors?: Row[];
  earnQualified?: Row[];
  earnUnqualified?: Row[];
  earnGopro?: Row[];
  earnSpeech?: Row[];
}) {
  const [tab, setTab] = useState<
    "jobs" | "applications" | "briefs" | "earn" | "vibe"
  >("jobs");
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
          <h1 className="text-xl font-semibold text-neutral-900">
            Admin dashboard
          </h1>
          <button
            onClick={handleLogout}
            className="text-sm text-neutral-500 hover:text-neutral-900"
          >
            Sign out
          </button>
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
            onClick={() => setTab("earn")}
            className={`px-3 py-2 text-sm font-medium ${
              tab === "earn"
                ? "border-b-2 border-neutral-900 text-neutral-900"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Earn ({earnQualified.length + earnUnqualified.length + earnGopro.length + earnSpeech.length})
          </button>
          <button
            onClick={() => setTab("vibe")}
            className={`px-3 py-2 text-sm font-medium ${
              tab === "vibe"
                ? "border-b-2 border-neutral-900 text-neutral-900"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Search
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
        ) : tab === "earn" ? (
          <EarnSection
            ambassadors={earnAmbassadors}
            qualified={earnQualified}
            unqualified={earnUnqualified}
            gopro={earnGopro}
            speech={earnSpeech}
          />
        ) : (
          <VibeSearch />
        )}
      </div>
    </div>
  );
}