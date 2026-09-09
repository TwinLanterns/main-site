"use client";

import { Fragment, useMemo, useState } from "react";
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

// Helper to extract AI tags from row (handles both array and object)
function getAITags(row: Row): { vibe_tags: string[]; soft_skills: string[]; hard_skills: string[]; ai_summary: string | null } | null {
  const raw = row.candidate_ai_tags;
  
  if (!raw) return null;
  
  // If it's an array, take the first element
  if (Array.isArray(raw)) {
    return raw.length > 0 ? raw[0] as any : null;
  }
  
  // If it's an object, return as-is
  return raw as any;
}

// ============================================
// NEW: Vibe Tag Pills Component
// ============================================
function VibeTags({ tags }: { tags: string[] | null }) {
  if (!tags || tags.length === 0) return <span className="text-xs text-neutral-400">—</span>;
  
  const colors = [
    "bg-blue-100 text-blue-800",
    "bg-green-100 text-green-800",
    "bg-purple-100 text-purple-800",
    "bg-amber-100 text-amber-800",
    "bg-pink-100 text-pink-800",
    "bg-indigo-100 text-indigo-800",
    "bg-cyan-100 text-cyan-800",
    "bg-rose-100 text-rose-800",
  ];
  
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag, i) => (
        <span
          key={tag}
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[i % colors.length]}`}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
// ============================================
// UPDATED: Table component with AI tags
// ============================================
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
              {showAIColumns && (
                <>
                  <th className="px-3 py-2 text-left font-medium text-neutral-600">vibe tags</th>
                  <th className="px-3 py-2 text-left font-medium text-neutral-600">soft skills</th>
                  <th className="px-3 py-2 text-left font-medium text-neutral-600">hard skills</th>
                  <th className="px-3 py-2 text-left font-medium text-neutral-600">ai summary</th>
                </>
              )}
              {showResumeColumn && <th className="px-3 py-2 text-left font-medium text-neutral-600">resume</th>}
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filtered.map((row) => {
              const id = String(row.id);
              const isExpanded = expandedId === id;
              const aiTags = getAITags(row);
              
              return (
                <Fragment key={id}>
                  <tr className="hover:bg-neutral-50">
                    {columns.map((col) => (
                      <td key={col} className="whitespace-nowrap px-3 py-2 text-neutral-800">
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
                    <tr>
                      <td
                        colSpan={columns.length + (showResumeColumn ? 2 : 1) + (showAIColumns ? 2 : 0)}
                        className="bg-neutral-50 px-3 py-3"
                      >
                        <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-all text-xs text-neutral-700">
                          {JSON.stringify(redactLongStrings(row), null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + (showResumeColumn ? 2 : 1) + (showAIColumns ? 2 : 0)}
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

// ============================================
// NEW: Vibe Search Component
// ============================================
function VibeSearch({ applications }: { applications: Row[] }) {
  const [vibePrompt, setVibePrompt] = useState("");
  const [results, setResults] = useState<Row[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Only candidates with AI tags
  const taggedCandidates = useMemo(() => {
  return applications.filter((app) => {
    const tags = getAITags(app);
    return tags?.vibe_tags && tags.vibe_tags.length > 0;
  });
}, [applications]);

  function handleVibeSearch() {
    if (!vibePrompt.trim()) return;
    
    setIsSearching(true);
    
    // Simple keyword matching against vibe tags, soft skills, and hard skills
    const promptWords = vibePrompt.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    
    const scored = taggedCandidates.map((candidate) => {
      const aiTags = getAITags(candidate);
      const allTags = [
        ...(aiTags?.vibe_tags || []),
        ...(aiTags?.soft_skills || []),
        ...(aiTags?.hard_skills || []),
      ].map((t: string) => t.toLowerCase());
      
      const summary = (aiTags?.ai_summary || "").toLowerCase();
      
      let score = 0;
      const matchedTags: string[] = [];
      
      for (const word of promptWords) {
        // Check tags
        for (const tag of allTags) {
          if (tag.includes(word) || word.includes(tag)) {
            score += 2;
            if (!matchedTags.includes(tag)) matchedTags.push(tag);
          }
        }
        // Check summary
        if (summary.includes(word)) {
          score += 1;
        }
      }
      
      return { candidate, score, matchedTags };
    });
    
    // Sort by score, filter out zero matches
    const ranked = scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    
    setResults(ranked.map((r) => r.candidate));
    setIsSearching(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Describe your ideal candidate…"
          value={vibePrompt}
          onChange={(e) => setVibePrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleVibeSearch()}
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
        <button
          onClick={handleVibeSearch}
          disabled={!vibePrompt.trim() || isSearching || taggedCandidates.length === 0}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {isSearching ? "Searching…" : "Vibe Search"}
        </button>
      </div>

      {taggedCandidates.length === 0 && (
        <p className="text-sm text-neutral-500">
          No candidates with AI tags yet. Run the tagging script first.
        </p>
      )}

      {results && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-neutral-700">
            Top {results.length} candidates for: "{vibePrompt}"
          </p>
          
          {results.length === 0 ? (
            <p className="text-sm text-neutral-400">No matches. Try different words.</p>
          ) : (
            <div className="space-y-2">
              {results.map((candidate, index) => {
                const aiTags = getAITags(candidate);
                return (
                  <div
                    key={candidate.id as string}
                    className="rounded-lg border border-neutral-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-neutral-900">
                          #{index + 1} — {candidate.first_name as string} {candidate.last_name as string}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {candidate.school as string} · {candidate.location as string}
                        </p>
                      </div>
                      <a
                        href={`/api/admin/resume/${candidate.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-blue-600 hover:underline"
                      >
                        View Resume
                      </a>
                    </div>
                    
                    <div className="mt-2">
                      <VibeTags tags={aiTags?.vibe_tags || []} />
                    </div>
                    
                    {aiTags?.ai_summary && (
                      <p className="mt-2 text-sm text-neutral-600">{aiTags.ai_summary}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// UPDATED: Main Dashboard with Vibe Search tab
// ============================================
export default function AdminDashboard({
  applications,
  briefs,
}: {
  applications: Row[];
  briefs: Row[];
}) {
  const [tab, setTab] = useState<"applications" | "briefs" | "vibe">("applications");
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
          <button
            onClick={() => setTab("vibe")}
            className={`px-3 py-2 text-sm font-medium ${
              tab === "vibe"
                ? "border-b-2 border-neutral-900 text-neutral-900"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Vibe Search (no ai yet just hold on)
          </button>
        </div>

        {tab === "applications" ? (
          <Table rows={applications} columns={APPLICATION_COLUMNS} showResumeColumn showAIColumns />
        ) : tab === "briefs" ? (
          <Table rows={briefs} columns={BRIEF_COLUMNS} />
        ) : (
          <VibeSearch applications={applications} />
        )}
      </div>
    </div>
  );
}