// app/api/ops/files/export/route.ts
//
// Delivery manifest CSV for one project. Gated in proxy.ts and re-checked
// here (role + project scope). Never includes private storage references.
// Cells are defused against spreadsheet formula injection (lib/ops/csv).

import { NextResponse } from "next/server";
import { OpsAuthError, requireActor, requireProject } from "@/lib/ops/auth";
import { db } from "@/lib/ops/db";
import { toCsv } from "@/lib/ops/csv";
import { fetchAllRows } from "@/lib/supabase-fetch-all";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: Request) {
  const projectId = new URL(req.url).searchParams.get("project") ?? "";
  if (!UUID_RE.test(projectId)) return NextResponse.json({ error: "Missing project" }, { status: 400 });
  try {
    const actor = await requireActor();
    await requireProject(actor, projectId);
  } catch (err) {
    if (err instanceof OpsAuthError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  const supabase = db();
  const [{ data: project }, { data: files, error }, { data: enrollments }] = await Promise.all([
    supabase.from("ops_projects").select("code").eq("id", projectId).maybeSingle<{ code: string }>(),
    // Paged: the manifest must include every file, not the first 1,000.
    fetchAllRows((from, to) =>
      supabase
        .from("ops_files")
        .select("id, session_id, enrollment_id, original_path, proposed_filename, recording_date, room, task_label, capture_mode, take_number, media_duration_seconds, duration_source, submission_state, submission_evidence, review_state, review_source, review_date, naming_rule_version, validation_status")
        .eq("project_id", projectId)
        .order("original_path")
        .order("id")
        .range(from, to),
    ),
    fetchAllRows((from, to) => supabase.from("ops_enrollments").select("id, anonymous_code").eq("project_id", projectId).order("id").range(from, to)),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const codeOf = new Map((enrollments ?? []).map((e) => [e.id as string, e.anonymous_code as string]));

  const header = [
    "file_id", "session_id", "operator_code", "original_path", "proposed_path", "recording_date", "room", "task", "mode", "take",
    "duration_seconds", "duration_source", "delivery_state", "delivery_evidence", "review_state", "review_source", "review_date",
    "naming_rule_version", "naming_check",
  ];
  const rows = (files ?? []).map((f) => [
    f.id, f.session_id, f.enrollment_id ? codeOf.get(f.enrollment_id) : "", f.original_path, f.proposed_filename, f.recording_date, f.room, f.task_label,
    f.capture_mode, f.take_number, f.media_duration_seconds, f.duration_source, f.submission_state, f.submission_evidence, f.review_state, f.review_source,
    f.review_date, f.naming_rule_version, f.validation_status,
  ]);
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(toCsv(header, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${(project?.code ?? "project").replace(/[^A-Za-z0-9_-]/g, "")}-manifest-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
