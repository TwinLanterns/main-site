// app/api/ops/shifts/route.ts
//
// Shift board for leadership + project managers (/ops/shifts). Same
// behavior as app/api/admin/shifts, plus an audit event per change.
// Gated in proxy.ts; role re-checked in withShiftManager.

import { withShiftManager } from "@/lib/ops/shift-auth";
import { deleteShiftRequest, postShifts } from "@/lib/submissions/shift-admin-handlers";

export function POST(req: Request) {
  return withShiftManager((onChange) => postShifts(req, onChange));
}

export function DELETE(req: Request) {
  return withShiftManager((onChange) => deleteShiftRequest(req, onChange));
}
