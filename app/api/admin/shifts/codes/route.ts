// app/api/admin/shifts/codes/route.ts
//
// Admin-only (gated in proxy.ts). Shift-board access codes:
// POST { people, send } gives each "Name, email" line a code and optionally
// emails it; PATCH { id } resends one; DELETE { id } revokes one.
// Project managers use the same handlers via app/api/ops/shifts/codes.

import { postShiftCodes, resendShiftCode, revokeShiftCode } from "@/lib/submissions/shift-admin-handlers";

export function POST(req: Request) {
  return postShiftCodes(req);
}

export function PATCH(req: Request) {
  return resendShiftCode(req);
}

export function DELETE(req: Request) {
  return revokeShiftCode(req);
}
