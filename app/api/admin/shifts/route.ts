// app/api/admin/shifts/route.ts
//
// Admin-only (gated in proxy.ts). POST creates shifts; DELETE either frees
// a shift up ({ id, release: true }) or removes it entirely ({ id }).
// Project managers use the same handlers via app/api/ops/shifts.

import { deleteShiftRequest, postShifts } from "@/lib/submissions/shift-admin-handlers";

export function POST(req: Request) {
  return postShifts(req);
}

export function DELETE(req: Request) {
  return deleteShiftRequest(req);
}
