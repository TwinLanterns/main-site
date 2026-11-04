// app/api/ops/shifts/codes/route.ts
//
// Shift-board access codes for leadership + project managers. Same
// behavior as app/api/admin/shifts/codes, plus an audit event per change.

import { withShiftManager } from "@/lib/ops/shift-auth";
import { postShiftCodes, resendShiftCode, revokeShiftCode } from "@/lib/submissions/shift-admin-handlers";

export function POST(req: Request) {
  return withShiftManager((onChange) => postShiftCodes(req, onChange));
}

export function PATCH(req: Request) {
  return withShiftManager((onChange) => resendShiftCode(req, onChange));
}

export function DELETE(req: Request) {
  return withShiftManager((onChange) => revokeShiftCode(req, onChange));
}
