/**
 * One-time script: Process all student applications through Groq AI
 * and store the results in candidate_ai_tags.
 *
 * Uses BOTH resume text AND raw application payload for tagging.
 *
 * Usage:
 *   Dry run (default):  npx tsx --env-file=.env.local scripts/tag-resumes.ts
 *   Commit (real run):  npx tsx --env-file=.env.local scripts/tag-resumes.ts --commit
 */

import Groq from "groq-sdk";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import * as mammoth from "mammoth";
import { getSupabaseServerClient } from "../lib/supabase-server";

// ============================================
// 1. CONFIGURATION
// ============================================
const COMMIT = process.argv.includes("--commit");
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  console.error("Missing GROQ_API_KEY. Check your .env.local file.");
  process.exit(1);
}

const supabase = getSupabaseServerClient();
const groq = new Groq({ apiKey: GROQ_API_KEY });

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
// 5. THE TAGGING FUNCTION (Now with raw_payload)
// ============================================
async function tagResume(
  resumeText: string,
  rawPayload: any,
  studentName: string,
): Promise<AITags> {
  const prompt = `
You are an expert recruiting AI. Analyze this candidate's complete profile including their resume AND application form responses.

Return ONLY valid JSON. Use this exact schema:
{
  "hard_skills": ["skill1", "skill2", "skill3", "skill4", "skill5"],
  "soft_skills": ["trait1", "trait2", "trait3", "trait4"],
  "vibe_tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "one_line_summary": "A single sentence describing the type of worker this person is."
}

However, don't let this template limit you. List as many skills and tags as possible. Make the summary as accurate as possible.

Instructions for the tags:
- "hard_skills" should be technical skills, tools, or methodologies (e.g., Salesforce, Python, Cold Calling).
- "soft_skills" should be personality/workplace traits (e.g., Detail-Oriented, Calm Under Pressure).
- "vibe_tags" should be short, punchy, modern descriptors of their professional persona (e.g., Scrappy, Grinder, Big Picture Thinker, Data-Driven, Independent Worker, Fast-Paced, Entrepreneurial, Community Builder).

RESUME TEXT:
${resumeText || "NO RESUME PROVIDED"}

APPLICATION FORM DATA:
${JSON.stringify(rawPayload, null, 2)}
`;

  const response = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages: [
      {
        role: "system",
        content:
          "You are an expert recruiting AI. Always return valid JSON without markdown code blocks.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
    response_format: { type: "json_object" },
  });

  const rawText = response.choices[0]?.message?.content || "";

  // Clean up if Groq still adds markdown
  let cleanText = rawText;
  if (cleanText.includes("```")) {
    cleanText = cleanText.split("```")[1];
    if (cleanText.startsWith("json")) {
      cleanText = cleanText.slice(4);
    }
  }

  return JSON.parse(cleanText.trim()) as AITags;
}

// ============================================
// 6. MAIN FUNCTION
// ============================================
async function main() {
  console.log(
    `\n${COMMIT ? "🔴 COMMIT MODE - Writing to Supabase" : "🟡 DRY RUN - No writes, no AI calls"}\n`,
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
    // In the main loop, before calling Groq:
    const existing = await supabase
      .from("candidate_ai_tags")
      .select("id")
      .eq("student_id", student.id)
      .eq("prompt_version", "v2")
      .maybeSingle();

    if (existing.data) {
      console.log(`  ✓ Already tagged (v2). Skipping.\n`);
      continue;
    }
    try {
      let resumeText = "";

      // Try to extract resume text if available
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

      // Check if we have either resume text OR raw payload
      const hasRawPayload =
        student.raw_payload && Object.keys(student.raw_payload).length > 0;

      if (!resumeText && !hasRawPayload) {
        console.log(`  ✗ No resume text AND no application data. Skipping.\n`);
        skippedCount++;
        continue;
      }

      if (COMMIT) {
        // Real run: Call Groq and write to Supabase
        const tags = await tagResume(resumeText, student.raw_payload, fullName);

        const { error: upsertError } = await supabase
          .from("candidate_ai_tags")
          .upsert(
            {
              student_id: student.id,
              hard_skills: tags.hard_skills,
              soft_skills: tags.soft_skills,
              vibe_tags: tags.vibe_tags,
              ai_summary: tags.one_line_summary,
              model_used: "llama-3.3-70b-versatile",
              prompt_version: "v2",
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
        console.log(`  ✓ Tagged: ${tags.vibe_tags.join(", ")}`);
        console.log(`    Summary: ${tags.one_line_summary}\n`);
      } else {
        // Dry run: Just print what would happen
        processedCount++;
        console.log(`  → Would call Groq and upsert to candidate_ai_tags`);
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

    // Small delay to be nice to the API (Groq is fast, so 200ms is fine)
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
// 7. RUN
// ============================================
main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
