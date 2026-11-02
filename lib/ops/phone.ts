// lib/ops/phone.ts
//
// Assumes US numbers for bare 10-digit input (the Nov 2 intake was all
// 10-digit). Anything else is kept as typed and left un-normalized so a
// human can fix it, rather than guessed at.

export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (raw.trim().startsWith("+") && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return null;
}

/** "••• 1234" — enough to tell records apart without exposing the number. */
export function maskPhone(e164: string): string {
  return e164 ? `••• ${e164.slice(-4)}` : "—";
}
