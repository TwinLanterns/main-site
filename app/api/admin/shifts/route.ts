// app/api/admin/shifts/route.ts
//
// Admin-only (gated in proxy.ts). POST creates shifts; DELETE either frees
// a shift up ({ id, release: true }) or removes it entirely ({ id }).

import { NextResponse } from "next/server";
import { badRequest, parseJsonBody } from "@/lib/http";
import {
  createShifts,
  deleteShift,
  parseNewShifts,
  releaseShift,
} from "@/lib/submissions/film-shifts";

function failed(err: unknown) {
  console.error("admin shifts failed", err);
  return NextResponse.json(
    { ok: false, error: err instanceof Error ? err.message : "Something went wrong" },
    { status: 500 },
  );
}

export async function POST(req: Request) {
  const parsed = await parseNewShifts(req);
  if (!parsed.ok) return badRequest(parsed.error);
  try {
    await createShifts(parsed.data);
  } catch (err) {
    return failed(err);
  }
  return NextResponse.json({ ok: true, created: parsed.data.rows.length });
}

export async function DELETE(req: Request) {
  const parsed = await parseJsonBody(req);
  const body = (parsed.ok ? parsed.body : null) as Record<string, unknown> | null;
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return badRequest("Missing shift id");
  try {
    if (body?.release === true) await releaseShift(id);
    else await deleteShift(id);
  } catch (err) {
    return failed(err);
  }
  return NextResponse.json({ ok: true });
}
