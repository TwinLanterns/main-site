// Shift-board access code format, shared by the server (lib/shift-access)
// and the admin UI. Codes are stored as 8 characters, shown as "K7QM-X2PD".

export const SHIFT_CODE_LENGTH = 8;

/** Codes are typed by hand, so ignore case, spaces and dashes. */
export function normalizeShiftCode(code: string) {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** "K7QMX2PD" → "K7QM-X2PD", for people to read. */
export function formatShiftCode(code: string) {
  return code.length === SHIFT_CODE_LENGTH ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}
