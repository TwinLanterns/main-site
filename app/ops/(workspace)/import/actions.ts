"use server";

// app/ops/import/actions.ts
//
// CSV imports. Preview never writes; commit re-parses the same upload with
// the confirmed options and writes once under a recorded import id.
// Reimporting identical data changes nothing (operator-day rows are keyed
// on project + source operator ID + date). Leadership only.

import { revalidatePath } from "next/cache";
import { OpsAuthError, requireActor, requireProject, type Actor } from "@/lib/ops/auth";
import { audit, db, nextAnonymousCode } from "@/lib/ops/db";
import { isFormulaLike, parseCsv } from "@/lib/ops/csv";
import { parseProductionTab, type ParsedTab, type ProductionCell } from "@/lib/ops/workbook";
import { normalizePhone } from "@/lib/ops/phone";
import { LEAD_STAGES, isKey } from "@/lib/ops/stages";
import { ROSTER_FIELDS, type RosterField } from "@/lib/ops/roster";
import { isPhoneText } from "@/lib/ops/form";
import { fetchAllRows } from "@/lib/supabase-fetch-all";

const MAX_BYTES = 900_000;

type Fail = { ok: false; error: string };

async function readUpload(fd: FormData): Promise<{ name: string; text: string } | Fail> {
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose a CSV file." };
  if (file.size > MAX_BYTES) return { ok: false, error: "File is too large (900 KB max). Export just the one tab." };
  if (!/\.csv$/i.test(file.name)) return { ok: false, error: "Upload a .csv export (File → Download → CSV for the one tab)." };
  return { name: file.name.slice(0, 200), text: await file.text() };
}

function field(fd: FormData, k: string, max = 200) {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

async function guard<T>(fn: (actor: Actor) => Promise<T>): Promise<T | Fail> {
  try {
    const actor = await requireActor(["leadership"]);
    return await fn(actor);
  } catch (err) {
    if (err instanceof OpsAuthError) return { ok: false, error: err.message };
    console.error("ops import failed", err);
    return { ok: false, error: err instanceof Error ? err.message : "Import failed." };
  }
}

/* --------------------------- production workbook ------------------------- */

type CellClass = "new" | "update" | "unchanged" | "conflict";

export interface ProductionPreview {
  ok: true;
  sourceFilename: string;
  layout: ParsedTab["layout"];
  headerRow: number;
  groups: ParsedTab["groups"];
  warnings: string[];
  rejected: ParsedTab["rejected"];
  sourceTotals: ParsedTab["sourceTotals"];
  discrepancies: ParsedTab["discrepancies"];
  recomputed: ParsedTab["recomputed"];
  counts: Record<CellClass, number>;
  /** Names deliberately omitted from the preview. */
  operators: { operatorId: string; placeholder: boolean; matched: string | null; deviceId: string | null; operationalStatus: string }[];
  sample: (Pick<ProductionCell, "sourceRow" | "operatorId" | "date" | "commit" | "submittedSeconds" | "acceptedSeconds"> & { cls: CellClass })[];
}

interface Prepared {
  parsed: ParsedTab;
  name: string;
  projectId: string;
  asOf: string;
  tab: string;
  classes: Map<string, CellClass>;
  existingIds: Map<string, string>; // source operator id → enrollment id
  enrollmentCodes: Map<string, string>; // enrollment id → code
}

async function prepare(actor: Actor, fd: FormData): Promise<Prepared | Fail> {
  const projectId = field(fd, "project_id", 64);
  await requireProject(actor, projectId);
  const asOf = field(fd, "source_as_of", 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) return { ok: false, error: "Enter the date the source was exported (as of)." };
  const tab = field(fd, "source_tab", 60);
  if (!tab) return { ok: false, error: "Name the source tab (e.g. W42 Production)." };
  const upload = await readUpload(fd);
  if ("ok" in upload) return upload;

  let groupDates: Record<string, string> = {};
  try {
    const raw = field(fd, "group_dates", 4000);
    if (raw) groupDates = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Couldn't read the date overrides." };
  }
  const yearRaw = field(fd, "default_year", 4);
  const parsed = parseProductionTab(parseCsv(upload.text), {
    defaultYear: yearRaw ? Number(yearRaw) : undefined,
    groupDates,
    numericDurationUnit: field(fd, "numeric_unit") === "fraction_of_day" ? "fraction_of_day" : "reject",
  });
  if ("error" in parsed) return { ok: false, error: parsed.error };

  const supabase = db();
  const [{ data: enr, error: enrError }, { data: existing, error: exError }] = await Promise.all([
    fetchAllRows((from, to) => supabase.from("ops_enrollments").select("id, anonymous_code, source_operator_id").eq("project_id", projectId).order("id").range(from, to)),
    // Paged so new-vs-update-vs-conflict is decided against every existing row.
    fetchAllRows((from, to) =>
      supabase
        .from("ops_daily_production")
        .select("id, source_operator_id, calendar_date, commit_quantity, submitted_seconds, accepted_seconds, source_as_of")
        .eq("project_id", projectId)
        .in("calendar_date", [...new Set(parsed.cells.map((c) => c.date))])
        .order("id")
        .range(from, to),
    ),
  ]);
  if (enrError || exError) throw new Error((enrError ?? exError)!.message);

  const existingIds = new Map<string, string>();
  const enrollmentCodes = new Map<string, string>();
  for (const e of enr ?? []) {
    enrollmentCodes.set(e.id as string, e.anonymous_code as string);
    if (e.source_operator_id) existingIds.set(e.source_operator_id as string, e.id as string);
  }
  const prior = new Map((existing ?? []).map((r) => [`${r.source_operator_id}|${r.calendar_date}`, r]));
  const classes = new Map<string, CellClass>();
  for (const c of parsed.cells) {
    const k = `${c.operatorId}|${c.date}`;
    const p = prior.get(k);
    if (!p) {
      classes.set(k, "new");
      continue;
    }
    const same =
      (p.commit_quantity === null ? c.commit === null : Number(p.commit_quantity) === c.commit) &&
      p.submitted_seconds === c.submittedSeconds &&
      p.accepted_seconds === c.acceptedSeconds;
    // A newer source already wrote this operator-day: don't silently overwrite it.
    classes.set(k, same ? "unchanged" : (p.source_as_of as string) > asOf ? "conflict" : "update");
  }
  return { parsed, name: upload.name, projectId, asOf, tab, classes, existingIds, enrollmentCodes };
}

export async function previewProduction(fd: FormData): Promise<ProductionPreview | Fail> {
  return guard(async (actor) => {
    const p = await prepare(actor, fd);
    if ("ok" in p) return p;
    const counts: Record<CellClass, number> = { new: 0, update: 0, unchanged: 0, conflict: 0 };
    for (const v of p.classes.values()) counts[v]++;
    const seen = new Set<string>();
    return {
      ok: true as const,
      sourceFilename: p.name,
      layout: p.parsed.layout,
      headerRow: p.parsed.headerRow,
      groups: p.parsed.groups,
      warnings: p.parsed.warnings,
      rejected: p.parsed.rejected,
      sourceTotals: p.parsed.sourceTotals,
      discrepancies: p.parsed.discrepancies,
      recomputed: p.parsed.recomputed,
      counts,
      operators: p.parsed.operators
        .filter((o) => !seen.has(o.operatorId) && seen.add(o.operatorId))
        .map((o) => {
          const id = p.existingIds.get(o.operatorId);
          return { operatorId: o.operatorId, placeholder: o.placeholder, matched: id ? p.enrollmentCodes.get(id) ?? null : null, deviceId: o.deviceId, operationalStatus: o.operationalStatus };
        }),
      sample: p.parsed.cells.slice(0, 200).map((c) => ({
        sourceRow: c.sourceRow,
        operatorId: c.operatorId,
        date: c.date,
        commit: c.commit,
        submittedSeconds: c.submittedSeconds,
        acceptedSeconds: c.acceptedSeconds,
        cls: p.classes.get(`${c.operatorId}|${c.date}`)!,
      })),
    };
  });
}

export async function commitProduction(fd: FormData): Promise<{ ok: true; message: string } | Fail> {
  return guard(async (actor) => {
    const p = await prepare(actor, fd);
    if ("ok" in p) return p;
    const createUnknown = fd.get("create_unknown") === "on";
    const overwrite = fd.get("overwrite_conflicts") === "on";
    const supabase = db();

    const unknown = [...new Map(p.parsed.operators.filter((o) => !p.existingIds.has(o.operatorId)).map((o) => [o.operatorId, o])).values()];
    if (unknown.length && !createUnknown) {
      return { ok: false, error: `${unknown.length} operator ID(s) aren't on this project yet. Tick “Create unconfirmed operator records” or remove those rows.` };
    }

    const write = p.parsed.cells.filter((c) => {
      const cls = p.classes.get(`${c.operatorId}|${c.date}`);
      return cls === "new" || cls === "update" || (cls === "conflict" && overwrite);
    });
    const skippedConflicts = [...p.classes.values()].filter((v) => v === "conflict").length - (overwrite ? [...p.classes.values()].filter((v) => v === "conflict").length : 0);

    const { data: imp, error: impError } = await supabase
      .from("ops_imports")
      .insert({
        project_id: p.projectId,
        kind: "production_tab",
        source_filename: p.name,
        source_tab: p.tab,
        source_as_of: p.asOf,
        actor_label: actor.label,
        mapping: { layout: p.parsed.layout, header_row: p.parsed.headerRow, groups: p.parsed.groups },
        row_counts: {
          operator_days_in_file: p.parsed.cells.length,
          written: write.length,
          unchanged: [...p.classes.values()].filter((v) => v === "unchanged").length,
          conflicts_skipped: skippedConflicts,
          rejected: p.parsed.rejected.length,
          operators_created: unknown.length,
        },
        rejected_rows: p.parsed.rejected,
        source_totals: p.parsed.sourceTotals,
        discrepancies: p.parsed.discrepancies,
      })
      .select("id")
      .single();
    if (impError) throw new Error(impError.message);

    // Unknown operators become protected person records + unconfirmed
    // enrollments. Their sheet status is kept with its as-of date; it is
    // not turned into an Active/Recording stage.
    for (const o of unknown) {
      const { data: person, error: pe } = await supabase
        .from("ops_people")
        .insert({ name: o.name || o.operatorId, sourced_by: `Workbook import ${p.tab}`, notes: "" })
        .select("id")
        .single();
      if (pe) throw new Error(pe.message);
      const code = await nextAnonymousCode(p.projectId);
      const { data: e, error: ee } = await supabase
        .from("ops_enrollments")
        .insert({
          person_id: person.id,
          project_id: p.projectId,
          anonymous_code: code,
          source_operator_id: o.operatorId,
          lead_stage: "onboarding",
          record_status: o.placeholder ? "placeholder" : "unconfirmed",
          imported_status: o.operationalStatus,
          imported_status_as_of: p.asOf,
        })
        .select("id")
        .single();
      if (ee) throw new Error(ee.message);
      p.existingIds.set(o.operatorId, e.id as string);
      await audit(actor, "enrollment.created_from_import", "enrollment", e.id as string, p.projectId, { import_id: imp.id, source_tab: p.tab, source_row: o.sourceRow, placeholder: o.placeholder });
    }

    if (write.length) {
      const rows = write.map((c) => ({
        project_id: p.projectId,
        enrollment_id: p.existingIds.get(c.operatorId) ?? null,
        source_operator_id: c.operatorId,
        calendar_date: c.date,
        commit_quantity: c.commit,
        submitted_seconds: c.submittedSeconds,
        accepted_seconds: c.acceptedSeconds,
        device_id: c.deviceId,
        device_id_original: c.deviceIdOriginal,
        operational_status: c.operationalStatus,
        equipment_status: c.equipmentStatus,
        source_tab: p.tab,
        source_row: c.sourceRow,
        source_as_of: p.asOf,
        import_id: imp.id,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase.from("ops_daily_production").upsert(rows, { onConflict: "project_id,source_operator_id,calendar_date" });
      if (error) throw new Error(error.message);
    }

    await audit(actor, "import.committed", "import", imp.id, p.projectId, { kind: "production_tab", source_tab: p.tab, written: write.length });
    revalidatePath("/ops", "layout");
    return {
      ok: true as const,
      message: `Import recorded. ${write.length} operator-days written, ${p.parsed.cells.length - write.length - skippedConflicts} unchanged, ${skippedConflicts} conflicts skipped, ${p.parsed.rejected.length} rejected, ${unknown.length} unconfirmed operator records created.`,
    };
  });
}

/* --------------------------------- roster -------------------------------- */


export interface RosterPreview {
  ok: true;
  headers: string[];
  rows: { row: number; status: "create" | "exists" | "probable_match" | "rejected"; reason: string; code?: string; name: string; phoneMasked: string; stage: string }[];
}

interface RosterPlanned {
  row: number;
  values: Record<RosterField, string>;
  phone: string;
  status: RosterPreview["rows"][number]["status"];
  reason: string;
}

async function planRoster(actor: Actor, fd: FormData): Promise<{ headers: string[]; planned: RosterPlanned[]; projectId: string; name: string } | Fail> {
  const projectId = field(fd, "project_id", 64);
  await requireProject(actor, projectId);
  const upload = await readUpload(fd);
  if ("ok" in upload) return upload;
  const grid = parseCsv(upload.text).filter((r) => r.some((c) => c.trim()));
  if (grid.length < 2) return { ok: false, error: "Need a header row and at least one data row." };
  const headers = grid[0].map((h) => h.trim());

  let mapping: Partial<Record<RosterField, number>> = {};
  try {
    mapping = JSON.parse(field(fd, "mapping", 2000) || "{}");
  } catch {
    return { ok: false, error: "Couldn't read the column mapping." };
  }
  if (mapping.name === undefined) return { ok: false, error: "Map a column to Name." };
  if (mapping.sourced_by === undefined && !field(fd, "default_sourced_by")) return { ok: false, error: "Map Sourced by, or give a default." };

  const supabase = db();
  // Paged: dedupe must see every person, not the first 1,000.
  const { data: people, error } = await fetchAllRows((from, to) =>
    supabase.from("ops_people").select("id, phone, intake_ref").is("merged_into", null).order("id").range(from, to),
  );
  if (error) throw new Error(error.message);
  const { data: enr, error: enrError } = await fetchAllRows((from, to) =>
    supabase.from("ops_enrollments").select("id, person_id, ops_people (name, sourced_by)").eq("project_id", projectId).order("id").range(from, to),
  );
  if (enrError) throw new Error(enrError.message);
  const onProject = new Set((enr ?? []).map((e) => e.person_id as string));
  // Rows with no phone and no intake ID can only be matched by name +
  // sourced_by, so a re-run of the same sheet doesn't create duplicates.
  const nameKey = (name: string, by: string) => `${name.trim().toLowerCase()}|${by.trim().toLowerCase()}`;
  const byName = new Set(
    (enr ?? []).map((e) => {
      const p = e.ops_people as unknown as { name: string; sourced_by: string } | null;
      return p ? nameKey(p.name, p.sourced_by) : "";
    }),
  );
  const byPhone = new Map((people ?? []).filter((x) => x.phone).map((x) => [x.phone as string, x.id as string]));
  const byRef = new Map((people ?? []).filter((x) => x.intake_ref).map((x) => [x.intake_ref as string, x.id as string]));

  const seenInFile = new Set<string>();
  const planned: RosterPlanned[] = grid.slice(1).map((r, i) => {
    const values = Object.fromEntries(ROSTER_FIELDS.map((f) => [f, mapping[f] !== undefined ? (r[mapping[f]!] ?? "").trim() : ""])) as Record<RosterField, string>;
    if (!values.sourced_by) values.sourced_by = field(fd, "default_sourced_by", 120);
    const row = i + 2;
    // Phones legitimately start with "+"; they're checked against phone
    // characters instead of the formula guard.
    const bad = ROSTER_FIELDS.find((f) => (f === "phone" ? !isPhoneText(values[f]) : isFormulaLike(values[f])));
    if (bad) return { row, values, phone: "", status: "rejected" as const, reason: `${bad}: formula-like text` };
    if (!values.name) return { row, values, phone: "", status: "rejected" as const, reason: "no name" };
    const phone = values.phone ? normalizePhone(values.phone) : "";
    if (phone === null) return { row, values, phone: "", status: "rejected" as const, reason: "unrecognizable phone" };
    if (values.lead_stage && !isKey(LEAD_STAGES, values.lead_stage)) return { row, values, phone, status: "rejected" as const, reason: `unknown stage "${values.lead_stage}" (use ${Object.keys(LEAD_STAGES).join(", ")})` };
    const dupKey = phone || values.intake_ref || `name:${nameKey(values.name, values.sourced_by)}`;
    if (dupKey && seenInFile.has(dupKey)) return { row, values, phone, status: "rejected" as const, reason: "same phone, intake ID, or name + sourced by earlier in this file" };
    if (dupKey) seenInFile.add(dupKey);
    const refMatch = values.intake_ref ? byRef.get(values.intake_ref) : undefined;
    if (refMatch && onProject.has(refMatch)) return { row, values, phone, status: "exists" as const, reason: "intake ID already imported to this project" };
    if (!phone && !values.intake_ref && byName.has(nameKey(values.name, values.sourced_by))) {
      return { row, values, phone, status: "probable_match" as const, reason: "same name and sourced-by as someone already on this project; add by hand if it's a different person" };
    }
    const phoneMatch = phone ? byPhone.get(phone) : undefined;
    if (phoneMatch || refMatch) return { row, values, phone, status: "probable_match" as const, reason: "matches an existing person — add via Operator CRM after confirming it's them" };
    return { row, values, phone, status: "create" as const, reason: "" };
  });
  return { headers, planned, projectId, name: upload.name };
}

export async function previewRoster(fd: FormData): Promise<RosterPreview | Fail> {
  return guard(async (actor) => {
    const projectId = field(fd, "project_id", 64);
    await requireProject(actor, projectId);
    if (!field(fd, "mapping")) {
      const upload = await readUpload(fd);
      if ("ok" in upload) return upload;
      const headers = (parseCsv(upload.text)[0] ?? []).map((h) => h.trim());
      return { ok: true as const, headers, rows: [] };
    }
    const plan = await planRoster(actor, fd);
    if ("ok" in plan) return plan;
    return {
      ok: true as const,
      headers: plan.headers,
      rows: plan.planned.map((p) => ({
        row: p.row,
        status: p.status,
        reason: p.reason,
        name: p.values.name,
        phoneMasked: p.phone ? `••• ${p.phone.slice(-4)}` : "—",
        stage: p.values.lead_stage || "new_lead",
      })),
    };
  });
}

export async function commitRoster(fd: FormData): Promise<{ ok: true; message: string } | Fail> {
  return guard(async (actor) => {
    const plan = await planRoster(actor, fd);
    if ("ok" in plan) return plan;
    const create = plan.planned.filter((p) => p.status === "create");
    const supabase = db();
    const { data: imp, error: impError } = await supabase
      .from("ops_imports")
      .insert({
        project_id: plan.projectId,
        kind: "roster",
        source_filename: plan.name,
        source_as_of: field(fd, "source_as_of", 10) || new Date().toISOString().slice(0, 10),
        actor_label: actor.label,
        mapping: JSON.parse(field(fd, "mapping", 2000)),
        row_counts: {
          rows: plan.planned.length,
          created: create.length,
          existing: plan.planned.filter((p) => p.status === "exists").length,
          probable_matches: plan.planned.filter((p) => p.status === "probable_match").length,
          rejected: plan.planned.filter((p) => p.status === "rejected").length,
        },
        rejected_rows: plan.planned.filter((p) => p.status === "rejected").map((p) => ({ row: p.row, reason: p.reason })),
      })
      .select("id")
      .single();
    if (impError) throw new Error(impError.message);

    for (const p of create) {
      const { data: person, error } = await supabase
        .from("ops_people")
        .insert({ name: p.values.name, phone: p.phone, phone_original: p.values.phone, email: p.values.email, sourced_by: p.values.sourced_by, intake_ref: p.values.intake_ref, notes: "" })
        .select("id")
        .single();
      if (error) throw new Error(`Row ${p.row}: ${error.message}`);
      const code = await nextAnonymousCode(plan.projectId);
      const { data: e, error: ee } = await supabase
        .from("ops_enrollments")
        .insert({
          person_id: person.id,
          project_id: plan.projectId,
          anonymous_code: code,
          lead_stage: p.values.lead_stage || "new_lead",
          lead_source: p.values.lead_source,
          channel: p.values.channel,
          next_action: p.values.next_action,
          availability: p.values.availability,
          notes: p.values.notes,
        })
        .select("id")
        .single();
      if (ee) throw new Error(`Row ${p.row}: ${ee.message}`);
      await audit(actor, "enrollment.created_from_import", "enrollment", e.id as string, plan.projectId, { import_id: imp.id, source_row: p.row });
    }
    await audit(actor, "import.committed", "import", imp.id, plan.projectId, { kind: "roster", created: create.length });
    revalidatePath("/ops", "layout");
    return { ok: true as const, message: `${create.length} leads created. Rows matching existing people were not imported — add them from Operator CRM after confirming.` };
  });
}
