/**
 * One-time script: Tag every student application with structured, evidence-based
 * metadata and store the results in candidate_ai_tags.
 *
 * Uses BOTH resume text AND the raw application payload as source material.
 *
 * LLM: DeepSeek via the self-hosted Playwright reverse proxy (non-streaming).
 *
 * Usage:
 *   Dry run (default):  npx tsx --env-file=.env.local scripts/tag-resumes.ts
 *   Commit (real run):  npx tsx --env-file=.env.local scripts/tag-resumes.ts --commit
 *
 * Required env:
 *   SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *   DEEPSEEK_PROXY_URL
 *   DEEPSEEK_API_KEY_REVERSE_PROXY
 */

import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import * as mammoth from "mammoth";
import { getSupabaseServerClient } from "../lib/supabase-server";
import { jsonrepair } from "jsonrepair";

// ============================================
// 1. CONFIGURATION
// ============================================
const COMMIT = process.argv.includes("--commit");
const DEBUG = process.env.DEBUG === "true";

const DEEPSEEK_PROXY_URL = process.env.DEEPSEEK_PROXY_URL;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY_REVERSE_PROXY;

if (!DEEPSEEK_PROXY_URL || !DEEPSEEK_API_KEY) {
  console.error(
    "Missing DEEPSEEK_PROXY_URL or DEEPSEEK_API_KEY_REVERSE_PROXY. Check your .env.local file.",
  );
  process.exit(1);
}

const DEEPSEEK_MODEL = "deepseek-chat";
const PROMPT_VERSION = "v5";
const REQUEST_TIMEOUT_MS = 200_000;

const supabase = getSupabaseServerClient();

// ============================================
// 2. TYPES
// ============================================
interface StudentApplication {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string;
  resume_data: string | null;
  resume_name: string | null;
  raw_payload: any;
}

interface AITags {
  hard_skills: string[];
  soft_skills: string[];
  vibe_tags: string[];
  one_line_summary: string;
  evidence?: {
    hard_skills?: Record<string, string>;
    soft_skills?: Record<string, string>;
    vibe_tags?: Record<string, string>;
  };
}

// ============================================
// 3. HELPER: Decode base64 resume data to Buffer
// ============================================
function decodeResumeData(resumeData: string): Buffer {
  const base64 = resumeData.includes(",")
    ? resumeData.split(",").pop()!
    : resumeData;
  return Buffer.from(base64, "base64");
}

// ============================================
// 4. HELPER: Extract text from PDF/DOCX buffer
// ============================================
async function extractTextFromBuffer(
  buffer: Buffer,
  fileName: string,
): Promise<string> {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";

  try {
    if (ext === "pdf") {
      const pdf = await pdfjsLib.getDocument({
        data: new Uint8Array(buffer),
      }).promise;

      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((item: any) => item.str).join(" ") + "\n";
      }
      return text;
    } else if (ext === "docx") {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } else if (ext === "txt") {
      return buffer.toString("utf-8");
    } else {
      console.log(`  ⚠ Unsupported file type: .${ext}. Skipping.`);
      return "";
    }
  } catch (err) {
    console.error(
      `  ✗ Error extracting text from ${fileName}:`,
      err instanceof Error ? err.message : err,
    );
    return "";
  }
}

// ============================================
// 5. HELPER: DeepSeek proxy (non-streaming)
// ============================================
function buildChatCompletionsUrl(base: string): string {
  const trimmed = base.replace(/\/+$/, "");
  if (trimmed.endsWith("/chat/completions")) return trimmed;
  if (trimmed.endsWith("/v1")) return `${trimmed}/chat/completions`;
  return `${trimmed}/v1/chat/completions`;
}

async function callDeepSeek(
  systemPrompt: string,
  userPrompt: string,
  opts: { temperature?: number; maxTokens?: number } = {},
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(buildChatCompletionsUrl(DEEPSEEK_PROXY_URL!), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        stream: false,
        temperature: opts.temperature ?? 0.2,
        max_tokens: opts.maxTokens ?? 2000,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`DeepSeek proxy ${res.status}: ${body.slice(0, 300)}`);
    }

    const json = (await res.json()) as any;
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("DeepSeek proxy returned no content");
    }

    if (DEBUG) {
      console.log("  [debug] raw DeepSeek content:\n", content, "\n");
    }

    return content;
  } finally {
    clearTimeout(timer);
  }
}

// ============================================
// 6. HELPER: Extract valid JSON from LLM output
// ============================================

function extractJson(raw: string): string {
  // Strip DeepSeek reasoning blocks per project convention.
  let text = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // Strip markdown fences if the model added them despite instructions.
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) text = fenceMatch[1].trim();

  // Slice to the outermost JSON object.
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    text = text.slice(start, end + 1);
  }

  // Repair structural issues: unquoted keys, trailing commas, raw newlines
  // inside strings, malformed nesting.
  return jsonrepair(text.trim());
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

// ============================================
// 7. THE TAGGING FUNCTION
// ============================================
const SYSTEM_PROMPT = [
  "You are an evidence-based candidate data extractor.",
  "You convert resumes and application forms into structured, objective tags.",
  "You never speculate, never infer personality, and never use marketing language.",
  "If a fact is not stated explicitly in the source, you do not output it.",
  "You return valid JSON only — no prose, no markdown fences, no commentary.",
].join(" ");

function buildUserPrompt(resumeText: string, rawPayload: any): string {
  return `Extract structured tags from the candidate record below.

## Rules

1. GROUNDING — Every item you output must be traceable to explicit text in the RESUME or APPLICATION DATA. If you cannot point to a source phrase that supports it, do not output it.
2. NO INFERENCE — Do not guess seniority, intelligence, work ethic, or personality from school names, GPA, writing style, or job titles.
3. NO MARKETING LANGUAGE — Forbidden words and their close synonyms: scrappy, grinder, rockstar, ninja, guru, passionate, dynamic, driven, go-getter, self-starter, visionary, world-class, 10x, A-player, hustler, thought leader, disruptor, unicorn.
4. SPECIFIC OVER VAGUE — Prefer "PostgreSQL" over "databases", "React" over "frontend". If the source says "Python", output "Python" — never upgrade it to "Python expert".
5. EMPTY IS ALLOWED — If a category has no supporting evidence, return an empty array. Never invent filler to hit a count.
6. LENGTH BUDGET — 5–15 hard skills, 3–8 soft skills, 3–8 work-style tags. Omit anything unsupported rather than padding.

## Category definitions

- "hard_skills": Concrete, verifiable skills. Named programming languages, frameworks, tools, platforms, certifications, methodologies, spoken languages, degrees, and domain knowledge. Parenthesize scope only when it clarifies (e.g. "SQL (PostgreSQL, BigQuery)").
- "soft_skills": Short, verifiable behavioral tags distilled from the candidate's
  actual work. Hard limits: maximum 6 words each, verb-first (past or present
  tense), no metrics, no company names, no "and"-joined clauses, no trailing
  periods.

  Do NOT copy resume bullets verbatim. If a bullet spans multiple ideas, pick the
  single strongest behavior and drop the rest. If a bullet's value is the metric,
  find the underlying action and tag that instead.

  Good: "Led cross-functional team", "Shipped weekly to production",
        "Wrote customer-facing docs", "Owned on-call rotation",
        "Migrated legacy services", "Mentored junior engineers".
  Bad (too long, is a resume bullet):
        "Designed and deployed a JavaScript navigation framework across production
         intranet applications, reducing code redundancy by 40%"
  Bad (adjective, not behavior): "Hard-working", "Team player", "Detail-oriented".
- "vibe_tags": Objective work-style descriptors grounded in the application data. Only output tags from the dimensions below, and only when the source clearly supports them:
    · Environment: early-stage startup / large org / agency / academic / nonprofit
    · Setup: remote / hybrid / in-person / async / timezone-spanning
    · Cadence: fast-iteration / structured-roadmap / research-heavy / ship-weekly
    · Scope: 0-to-1 builder / maintained existing systems / customer-facing / internal-tools
    · Function mix: IC-only / player-coach / cross-functional
  Do not invent new tags. If nothing in the source supports a dimension, leave it out.
- "one_line_summary": One neutral sentence stating what the person has done and what they are looking for, using only facts from the source. No character adjectives. Maximum 25 words.

## Output schema

Return ONLY this JSON object:

{
  "hard_skills": ["..."],
  "soft_skills": ["..."],
  "vibe_tags": ["..."],
  "one_line_summary": "...",
  "evidence": {
    "hard_skills": { "<tag>": "<exact source phrase>" },
    "soft_skills": { "<tag>": "<exact source phrase>" },
    "vibe_tags":   { "<tag>": "<exact source phrase>" }
  }
}

Empty categories use [] and {}.

Inside every JSON string, escape double quotes as \\\" and newlines as \\n. Never emit a raw newline or unescaped quote inside a string value.
## RESUME

${resumeText || "NO RESUME PROVIDED"}

## APPLICATION DATA

${JSON.stringify(rawPayload, null, 2)}
`;
}

async function tagResume(
  resumeText: string,
  rawPayload: any,
): Promise<AITags> {
  const raw = await callDeepSeek(
    SYSTEM_PROMPT,
    buildUserPrompt(resumeText, rawPayload),
    { temperature: 0.1, maxTokens: 2500 },
  );

  const parsed = JSON.parse(extractJson(raw)) as Partial<AITags> & {
    evidence?: AITags["evidence"];
  };

  return {
    hard_skills: toStringArray(parsed.hard_skills),
    soft_skills: toStringArray(parsed.soft_skills),
    vibe_tags: toStringArray(parsed.vibe_tags),
    one_line_summary:
      typeof parsed.one_line_summary === "string"
        ? parsed.one_line_summary.trim()
        : "",
    evidence: parsed.evidence,
  };
}

// ============================================
// 8. MAIN FUNCTION
// ============================================
async function main() {
  console.log(
    `\n${COMMIT ? "🔴 COMMIT MODE - Writing to Supabase" : "🟡 DRY RUN - No writes, no AI calls"}\n`,
  );
  console.log(
    `Model: ${DEEPSEEK_MODEL}  ·  prompt_version: ${PROMPT_VERSION}\n`,
  );
  console.log("Fetching all students from Supabase...\n");

  const { data: students, error } = await supabase
    .from("student_applications")
    .select(
      "id, first_name, last_name, email, resume_data, resume_name, raw_payload",
    )
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching students:", error);
    process.exit(1);
  }

  if (!students || students.length === 0) {
    console.log("No students found.");
    return;
  }

  console.log(`Found ${students.length} students.\n`);

  let processedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < students.length; i++) {
    const student = students[i] as StudentApplication;
    const fullName = `${student.first_name} ${student.last_name || ""}`.trim();
    const fileName = student.resume_name || "no-resume";

    console.log(
      `[${i + 1}/${students.length}] Processing: ${fullName} (${fileName})`,
    );

    // Idempotency guard: skip rows already tagged at the current prompt version.
    const existing = await supabase
      .from("candidate_ai_tags")
      .select("id")
      .eq("student_id", student.id)
      .eq("prompt_version", PROMPT_VERSION)
      .maybeSingle();

    if (existing.data) {
      console.log(`  ✓ Already tagged (${PROMPT_VERSION}). Skipping.\n`);
      continue;
    }

    try {
      let resumeText = "";

      if (student.resume_data) {
        const buffer = decodeResumeData(student.resume_data);
        resumeText = await extractTextFromBuffer(buffer, fileName);

        if (resumeText && resumeText.length >= 50) {
          console.log(
            `  ✓ Extracted ${resumeText.length} characters from resume.`,
          );
        } else {
          console.log(
            `  ⚠ No usable resume text. Using application form data only.`,
          );
          resumeText = "";
        }
      } else {
        console.log(`  ⚠ No resume on file. Using application form data only.`);
      }

      const hasRawPayload =
        student.raw_payload && Object.keys(student.raw_payload).length > 0;

      if (!resumeText && !hasRawPayload) {
        console.log(`  ✗ No resume text AND no application data. Skipping.\n`);
        skippedCount++;
        continue;
      }

      if (COMMIT) {
        const tags = await tagResume(resumeText, student.raw_payload);

        const { error: upsertError } = await supabase
          .from("candidate_ai_tags")
          .upsert(
            {
              student_id: student.id,
              hard_skills: tags.hard_skills,
              soft_skills: tags.soft_skills,
              vibe_tags: tags.vibe_tags,
              ai_summary: tags.one_line_summary,
              model_used: DEEPSEEK_MODEL,
              prompt_version: PROMPT_VERSION,
              source_file_name: fileName,
              ai_processed_at: new Date().toISOString(),
              raw_ai_response: tags,
            },
            { onConflict: "student_id,prompt_version" },
          );

        if (upsertError) {
          throw upsertError;
        }

        processedCount++;
        console.log(`  ✓ Tagged: ${tags.vibe_tags.join(", ") || "(none)"}`);
        console.log(`    Summary: ${tags.one_line_summary || "(none)"}\n`);
      } else {
        processedCount++;
        console.log(
          `  → Would call DeepSeek and upsert to candidate_ai_tags (${PROMPT_VERSION})`,
        );
        const preview =
          resumeText || JSON.stringify(student.raw_payload).slice(0, 150);
        console.log(`    Preview: ${preview.replace(/\n/g, " ")}...\n`);
      }
    } catch (err) {
      errorCount++;
      if (err instanceof Error) {
        console.error(`  ✗ Error: ${err.message}`);
      } else if (typeof err === "object") {
        console.error(`  ✗ Error: ${JSON.stringify(err, null, 2)}`);
      } else {
        console.error(`  ✗ Error: ${err}`);
      }
      console.error("");
    }

    // Be polite to the proxy.
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  console.log("\n" + "=".repeat(60));
  console.log(`${COMMIT ? "PROCESSING COMPLETE" : "DRY RUN COMPLETE"}`);
  console.log(`✓ Processed: ${processedCount}`);
  console.log(`⚠ Skipped: ${skippedCount}`);
  console.log(`✗ Errors: ${errorCount}`);
  if (!COMMIT) {
    console.log("\nNo changes were made to Supabase.");
    console.log("Run with --commit to actually process and write results:");
    console.log(
      "  npx tsx --env-file=.env.local scripts/tag-resumes.ts --commit",
    );
  }
  console.log("=".repeat(60));
}

// ============================================
// 9. RUN
// ============================================
main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});