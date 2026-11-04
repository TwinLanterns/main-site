// lib/ops/shift-auth.ts
//
// Auth + audit for the ops shift-board API (app/api/ops/shifts/*). The
// board and its access codes aren't tied to a project, so this checks role
// only: leadership and project managers. Reviewers are excluded because the
// board shows filmers' contact details.

import { NextResponse } from "next/server";
import { OpsAuthError, requireActor, type Actor } from "./auth";
import { audit } from "./db";
import type { ShiftChange } from "@/lib/submissions/shift-admin-handlers";

export const SHIFT_MANAGERS = ["leadership", "manager"] as const;

/** Runs `handler` for a leadership/manager caller, auditing each change. */
export async function withShiftManager(
  handler: (onChange: ShiftChange) => Promise<Response>,
): Promise<Response> {
  let actor: Actor;
  try {
    actor = await requireActor([...SHIFT_MANAGERS]);
  } catch (err) {
    if (err instanceof OpsAuthError) return NextResponse.json({ ok: false, error: err.message }, { status: 403 });
    throw err;
  }
  const entity = (action: string) => (action.startsWith("shift_code") ? "film_shift_code" : "film_shift");
  return handler((action, id, detail) => audit(actor, action, entity(action), id, null, detail));
}
