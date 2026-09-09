/**
 * One-time script: Process all student resumes through Gemini AI
 * and store the results in candidate_ai_tags.
 *
 * Usage:
 *   Dry run (default):  npx tsx --env-file=.env.local scripts/tag-resumes.ts
 *   Commit (real run):  npx tsx --env-file=.env.local scripts/tag-resumes.ts --commit
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import * as mammoth from "mammoth";
import { getSupabaseServerClient } from "../lib/supabase-server";

// ============================================
// 1. CONFIGURATION
// ============================================
const COMMIT = process.argv.includes("--commit");
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("Missing GEMINI_API_KEY. Check your .env.local file.");
  process.exit(1);
}

const supabase = getSupabaseServerClient();
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

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
  const base64 = resumeData.includes(",") ? resumeData.split(",").pop()! : resumeData;
  return Buffer.from(base64, "base64");
}

// ============================================
// 4. HELPER: Extract text from PDF/DOCX buffer
// ============================================
async function extractTextFromBuffer(buffer: Buffer, fileName: string): Promise<string> {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  
  try {
    if (ext === "pdf") {
      // Use legacy build for Node.js compatibility
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
    console.error(`  ✗ Error extracting text from ${fileName}:`, err instanceof Error ? err.message : err);
    return "";
  }
}
// ============================================
// 5. THE TAGGING FUNCTION
// ============================================
async function tagResume(resumeText: string, studentName: string): Promise<AITags> {
  const prompt = `
You are an expert recruiting AI. Read the resume text below and extract the candidate's professional profile.

Return ONLY valid JSON. Do not include markdown or extra text. Use this exact schema:
{{
  "hard_skills": ["skill1", "skill2", "skill3", "skill4", "skill5"],
  "soft_skills": ["trait1", "trait2", "trait3", "trait4"],
  "vibe_tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "one_line_summary": "A single sentence describing the type of worker this person is."
}}
However, don't let this template limit you. List as many skills and tags as possible, but make the summary as accurate as possible.

Instructions for the tags:
- "hard_skills" should be technical skills, tools, or methodologies (e.g., Salesforce, Python, Cold Calling).
- "soft_skills" should be personality/workplace traits (e.g., Detail-Oriented, Calm Under Pressure).
- "vibe_tags" should be short, punchy, modern descriptors of their professional persona (e.g., Scrappy, Grinder, Big Picture Thinker, Data-Driven, Independent Worker, Fast-Paced).


Resume Text:
${resumeText}
`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const rawText = response.text();
  
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
  console.log(`\n${COMMIT ? "🔴 COMMIT MODE - Writing to Supabase" : "🟡 DRY RUN - No writes, no AI calls"}\n`);
  console.log("Fetching all students from Supabase...\n");
  
  const { data: students, error } = await supabase
    .from("student_applications")
    .select("id, first_name, last_name, email, resume_data, resume_name")
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
    const fileName = student.resume_name || "unknown";
    
    console.log(`[${i + 1}/${students.length}] Processing: ${fullName} (${fileName})`);
    
    if (!student.resume_data) {
      console.log(`  ✗ No resume on file. Skipping.\n`);
      skippedCount++;
      continue;
    }
    
    try {
      const buffer = decodeResumeData(student.resume_data);
      const resumeText = await extractTextFromBuffer(buffer, fileName);
      
      if (!resumeText || resumeText.length < 50) {
        console.log(`  ✗ Could not extract meaningful text. Skipping.\n`);
        skippedCount++;
        continue;
      }
      
      console.log(`  ✓ Extracted ${resumeText.length} characters of text.`);
      
      if (COMMIT) {
        // Real run: Call Gemini and write to Supabase
        const tags = await tagResume(resumeText, fullName);
        
        const { error: upsertError } = await supabase
          .from("candidate_ai_tags")
          .upsert(
            {
              student_id: student.id,
              hard_skills: tags.hard_skills,
              soft_skills: tags.soft_skills,
              vibe_tags: tags.vibe_tags,
              ai_summary: tags.one_line_summary,
              model_used: "gemini-3.6-flash",
              prompt_version: "v1",
              source_file_name: fileName,
              ai_processed_at: new Date().toISOString(),
            },
            { onConflict: "student_id,prompt_version" }
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
        console.log(`  → Would call Gemini and upsert to candidate_ai_tags`);
        console.log(`    First 150 chars: ${resumeText.slice(0, 150).replace(/\n/g, " ")}...\n`);
      }
      
    } catch (err) {
      errorCount++;
      console.error(`  ✗ Error: ${err instanceof Error ? err.message : err}\n`);
    }
    
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  
  console.log("\n" + "=".repeat(60));
  console.log(`${COMMIT ? "PROCESSING COMPLETE" : "DRY RUN COMPLETE"}`);
  console.log(`✓ Processed: ${processedCount}`);
  console.log(`⚠ Skipped: ${skippedCount}`);
  console.log(`✗ Errors: ${errorCount}`);
  if (!COMMIT) {
    console.log("\nNo changes were made to Supabase.");
    console.log("Run with --commit to actually process and write results:");
    console.log("  npx tsx --env-file=.env.local scripts/tag-resumes.ts --commit");
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