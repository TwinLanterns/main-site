// lib/ops/form.ts
//
// FormData readers for the /ops server actions. Every field is untrusted:
// trimmed, length-capped, and rejected if it's formula-like text that a
// spreadsheet would execute on a later export.

import { isFormulaLike } from "./csv";

export type ActionResult = { ok: true; message?: string; secret?: string } | { ok: false; error: string };

export class FieldError extends Error {}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function str(fd: FormData, key: string, max = 500): string {
  const v = fd.get(key);
  const s = typeof v === "string" ? v.trim().slice(0, max) : "";
  if (s && isFormulaLike(s)) throw new FieldError(`"${key}" can't start with =, +, - or @.`);
  return s;
}

export function required(fd: FormData, key: string, label: string, max = 500): string {
  const s = str(fd, key, max);
  if (!s) throw new FieldError(`${label} is required.`);
  return s;
}

export function uuid(fd: FormData, key: string): string {
  const s = str(fd, key, 64);
  if (!UUID_RE.test(s)) throw new FieldError(`Missing or invalid ${key}.`);
  return s;
}

export function optUuid(fd: FormData, key: string): string | null {
  const s = str(fd, key, 64);
  if (!s) return null;
  if (!UUID_RE.test(s)) throw new FieldError(`Invalid ${key}.`);
  return s;
}

export function optDate(fd: FormData, key: string): string | null {
  const s = str(fd, key, 10);
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s))) throw new FieldError(`${key} must be a date.`);
  return s;
}

export function oneOf<T extends string>(fd: FormData, key: string, allowed: readonly T[]): T {
  const s = str(fd, key, 64);
  if (!(allowed as readonly string[]).includes(s)) throw new FieldError(`Invalid ${key}.`);
  return s as T;
}

export function optNumber(fd: FormData, key: string, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}): number | null {
  const s = str(fd, key, 32);
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < min || n > max) throw new FieldError(`${key} must be a number between ${min} and ${max}.`);
  return n;
}

export function checked(fd: FormData, key: string): boolean {
  return fd.get(key) === "on" || fd.get(key) === "true";
}
