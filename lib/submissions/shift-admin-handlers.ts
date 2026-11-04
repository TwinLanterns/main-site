// lib/submissions/shift-admin-handlers.ts
//
// Request handlers for managing the shift board, shared by the admin API
// (app/api/admin/shifts/*, shared admin login) and the ops API
// (app/api/ops/shifts/*, leadership + project managers). Callers do their
// own auth first; `onChange` lets the ops routes write an audit event.

import { NextResponse } from "next/server";
import { badRequest, parseJsonBody } from "@/lib/http";
import { createShifts, deleteShift, parseNewShifts, releaseShift } from "./film-shifts";
import { addPeople, parsePeople, resendCode, revokeCode } from "./film-shift-codes";

export type ShiftChange = (action: string, entityId: string, detail?: Record<string, unknown>) => Promise<void>;

const noop: ShiftChange = async () => {};

function failed(label: string, err: unknown) {
  console.error(`${label} failed`, err);
  return NextResponse.json(
    { ok: false, error: err instanceof Error ? err.message : "Something went wrong" },
    { status: 500 },
  );
}

async function jsonBody(req: Request) {
  const parsed = await parseJsonBody(req);
  const b = parsed.ok ? parsed.body : null;
  return (b && typeof b === "object" ? b : null) as Record<string, unknown> | null;
}

/* --------------------------------- shifts --------------------------------- */

/** POST: creates one shift per camera over a time block. */
export async function postShifts(req: Request, onChange: ShiftChange = noop) {
  const parsed = await parseNewShifts(req);
  if (!parsed.ok) return badRequest(parsed.error);
  const rows = parsed.data.rows;
  try {
    await createShifts(parsed.data);
  } catch (err) {
    return failed("shifts create", err);
  }
  await onChange("film_shift.created", "batch", {
    starts_at: rows[0].starts_at,
    ends_at: rows[0].ends_at,
    cameras: rows.map((r) => r.camera),
    location: rows[0].location,
  });
  return NextResponse.json({ ok: true, created: rows.length });
}

/** DELETE { id, release? }: frees a shift up, or removes it entirely. */
export async function deleteShiftRequest(req: Request, onChange: ShiftChange = noop) {
  const body = await jsonBody(req);
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return badRequest("Missing shift id");
  const release = body?.release === true;
  try {
    if (release) await releaseShift(id);
    else await deleteShift(id);
  } catch (err) {
    return failed("shift delete", err);
  }
  await onChange(release ? "film_shift.reopened" : "film_shift.deleted", id);
  return NextResponse.json({ ok: true });
}

/* ------------------------------ access codes ------------------------------ */

/** POST { people, send }: gives each "Name, email" line a code, optionally emails it. */
export async function postShiftCodes(req: Request, onChange: ShiftChange = noop) {
  const b = await jsonBody(req);
  const raw = typeof b?.people === "string" ? b.people.slice(0, 50_000) : "";
  const { people, invalid } = parsePeople(raw);
  if (people.length === 0) {
    return badRequest(
      invalid.length
        ? `Couldn't read: ${invalid.slice(0, 3).join("; ")}. Use "Name, email".`
        : "Add at least one person.",
    );
  }
  try {
    const result = await addPeople(people, b?.send === true);
    await onChange("shift_code.added", "batch", {
      created: result.created,
      existing: result.existing,
      sent: result.sent,
    });
    return NextResponse.json({ ok: true, ...result, invalid });
  } catch (err) {
    return failed("shift codes add", err);
  }
}

/** PATCH { id }: re-emails one code. */
export async function resendShiftCode(req: Request, onChange: ShiftChange = noop) {
  const b = await jsonBody(req);
  const id = typeof b?.id === "string" ? b.id : "";
  if (!id) return badRequest("Missing code id");
  try {
    await resendCode(id);
  } catch (err) {
    return failed("shift code resend", err);
  }
  await onChange("shift_code.resent", id);
  return NextResponse.json({ ok: true });
}

/** DELETE { id }: revokes one code. */
export async function revokeShiftCode(req: Request, onChange: ShiftChange = noop) {
  const b = await jsonBody(req);
  const id = typeof b?.id === "string" ? b.id : "";
  if (!id) return badRequest("Missing code id");
  try {
    await revokeCode(id);
  } catch (err) {
    return failed("shift code revoke", err);
  }
  await onChange("shift_code.revoked", id);
  return NextResponse.json({ ok: true });
}
