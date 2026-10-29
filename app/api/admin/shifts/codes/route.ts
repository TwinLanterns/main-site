// app/api/admin/shifts/codes/route.ts
//
// Admin-only (gated in proxy.ts). Shift-board access codes:
// POST { people, send } gives each "Name, email" line a code and optionally
// emails it; PATCH { id } resends one; DELETE { id } revokes one.

import { NextResponse } from "next/server";
import { badRequest, parseJsonBody } from "@/lib/http";
import {
  addPeople,
  parsePeople,
  resendCode,
  revokeCode,
} from "@/lib/submissions/film-shift-codes";

function failed(err: unknown) {
  console.error("admin shift codes failed", err);
  return NextResponse.json(
    { ok: false, error: err instanceof Error ? err.message : "Something went wrong" },
    { status: 500 },
  );
}

async function body(req: Request) {
  const parsed = await parseJsonBody(req);
  return (parsed.ok ? parsed.body : null) as Record<string, unknown> | null;
}

export async function POST(req: Request) {
  const b = await body(req);
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
    return NextResponse.json({ ok: true, ...result, invalid });
  } catch (err) {
    return failed(err);
  }
}

export async function PATCH(req: Request) {
  const b = await body(req);
  const id = typeof b?.id === "string" ? b.id : "";
  if (!id) return badRequest("Missing code id");
  try {
    await resendCode(id);
  } catch (err) {
    return failed(err);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const b = await body(req);
  const id = typeof b?.id === "string" ? b.id : "";
  if (!id) return badRequest("Missing code id");
  try {
    await revokeCode(id);
  } catch (err) {
    return failed(err);
  }
  return NextResponse.json({ ok: true });
}
