// lib/submissions/film-shifts.ts
//
// Parse + persist for the filming shift board (app/api/shifts/claim) and
// its admin controls (app/api/admin/shifts). Mirrors data-request.ts. No
// email OTP: filmers are people the team already knows, and a bogus claim
// is visible in /admin and released in one click.

import { parseJsonBody } from "@/lib/http";
import { isValidEmail } from "@/lib/validation";
import { getSupabaseOrThrow } from "@/lib/supabase-or-throw";
import { shiftTimeToUtc } from "@/lib/shift-time";

/** What the public board sees — never who took a shift. */
export interface PublicShift {
  id: string;
  starts_at: string;
  ends_at: string;
  camera: string;
  location: string;
  notes: string;
  taken: boolean;
}

export interface ShiftClaimPayload {
  shiftId: string;
  name: string;
  email: string;
  phone: string;
}

export interface ClaimedShift {
  starts_at: string;
  ends_at: string;
  camera: string;
  location: string;
  notes: string;
}

export interface NewShiftsPayload {
  rows: {
    starts_at: string;
    ends_at: string;
    camera: string;
    location: string;
    notes: string;
  }[];
}

export type ParseShiftClaimResult =
  | { ok: true; data: ShiftClaimPayload }
  // Honeypot filled: the route pretends success so bots don't adapt.
  | { ok: true; spam: true }
  | { ok: false; error: string };

export class ShiftConfigError extends Error {}
export class ShiftSaveError extends Error {}
/** Someone else got there first, or the shift was removed. */
export class ShiftUnavailableError extends Error {}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function text(p: Record<string, unknown>, key: string, max: number): string {
  const v = p[key];
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function client() {
  return getSupabaseOrThrow(
    (err) =>
      new ShiftConfigError(
        err instanceof Error ? err.message : "Supabase not configured",
      ),
  );
}

async function body(req: Request): Promise<Record<string, unknown> | null> {
  const parsed = await parseJsonBody(req);
  if (!parsed.ok || typeof parsed.body !== "object" || parsed.body === null) {
    return null;
  }
  return parsed.body as Record<string, unknown>;
}

/* ---------------------------------- public ---------------------------------- */

/** Shifts that haven't ended yet, soonest first. */
export async function listUpcomingShifts(): Promise<PublicShift[]> {
  const { data, error } = await client()
    .from("film_shifts")
    .select("id, starts_at, ends_at, camera, location, notes, film_shift_signups(id)")
    .gt("ends_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .order("camera", { ascending: true });

  if (error) {
    console.error("supabase select error (film_shifts)", error);
    throw new ShiftSaveError(error.message);
  }

  return (data ?? []).map(({ film_shift_signups: signup, ...shift }) => ({
    ...shift,
    // unique(shift_id) makes PostgREST embed an object (or null), but be
    // tolerant of the array shape too.
    taken: Array.isArray(signup) ? signup.length > 0 : Boolean(signup),
  }));
}

export async function parseShiftClaim(
  req: Request,
): Promise<ParseShiftClaimResult> {
  const p = await body(req);
  if (!p) return { ok: false, error: "Invalid request" };

  // Hidden field real users never see or fill.
  if (text(p, "website", 500)) return { ok: true, spam: true };

  const shiftId = text(p, "shiftId", 64);
  const name = text(p, "name", 200);
  const email = text(p, "email", 200);
  const phone = text(p, "phone", 40);

  if (!UUID_RE.test(shiftId)) return { ok: false, error: "Pick a shift." };
  if (name.length < 2) return { ok: false, error: "Please add your name." };
  if (!isValidEmail(email)) return { ok: false, error: "Please add a valid email." };
  if (phone.replace(/\D/g, "").length < 7) {
    return { ok: false, error: "Please add a phone number." };
  }

  return { ok: true, data: { shiftId, name, email, phone } };
}

export async function claimShift(p: ShiftClaimPayload): Promise<ClaimedShift> {
  const supabase = client();

  const { data: shift, error: shiftError } = await supabase
    .from("film_shifts")
    .select("starts_at, ends_at, camera, location, notes")
    .eq("id", p.shiftId)
    .maybeSingle<ClaimedShift>();

  if (shiftError) {
    console.error("supabase select error (film_shifts)", shiftError);
    throw new ShiftSaveError(shiftError.message);
  }
  if (!shift || new Date(shift.ends_at).getTime() <= Date.now()) {
    throw new ShiftUnavailableError("That shift is no longer available.");
  }

  const { error } = await supabase.from("film_shift_signups").insert({
    shift_id: p.shiftId,
    name: p.name,
    email: p.email,
    phone: p.phone,
  });

  if (error) {
    // 23505: unique(shift_id) — taken. 23503: shift deleted mid-claim.
    if (error.code === "23505" || error.code === "23503") {
      throw new ShiftUnavailableError("Someone just took that shift. Pick another one.");
    }
    console.error("supabase insert error (film_shift_signups)", error);
    throw new ShiftSaveError(error.message);
  }

  return shift;
}

/* ---------------------------------- admin ----------------------------------- */

/**
 * Body: { date, start, end, cameras, location?, notes? }. `cameras` is a
 * comma-separated list ("Camera 1, Camera 2") — one shift is created per
 * camera over the same block. An end at or before the start means the
 * shift runs past midnight.
 */
export async function parseNewShifts(
  req: Request,
): Promise<{ ok: true; data: NewShiftsPayload } | { ok: false; error: string }> {
  const p = await body(req);
  if (!p) return { ok: false, error: "Invalid request" };

  const date = text(p, "date", 10);
  const startsAt = shiftTimeToUtc(date, text(p, "start", 5));
  const endsAt = shiftTimeToUtc(date, text(p, "end", 5));
  if (!startsAt || !endsAt) return { ok: false, error: "Add a date, start and end time." };
  if (endsAt <= startsAt) endsAt.setUTCDate(endsAt.getUTCDate() + 1);

  const cameras = [
    ...new Set(
      text(p, "cameras", 500)
        .split(",")
        .map((c) => c.trim().slice(0, 80))
        .filter(Boolean),
    ),
  ];
  if (cameras.length === 0) return { ok: false, error: "Name at least one camera." };
  if (cameras.length > 20) return { ok: false, error: "That's a lot of cameras — 20 max at once." };

  const location = text(p, "location", 200);
  const notes = text(p, "notes", 1000);

  return {
    ok: true,
    data: {
      rows: cameras.map((camera) => ({
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        camera,
        location,
        notes,
      })),
    },
  };
}

export async function createShifts(p: NewShiftsPayload): Promise<void> {
  const { error } = await client().from("film_shifts").insert(p.rows);
  if (error) {
    console.error("supabase insert error (film_shifts)", error);
    throw new ShiftSaveError(error.message);
  }
}

/** Deletes a shift (and its signup, via cascade). */
export async function deleteShift(id: string): Promise<void> {
  if (!UUID_RE.test(id)) throw new ShiftSaveError("Invalid shift id");
  const { error } = await client().from("film_shifts").delete().eq("id", id);
  if (error) {
    console.error("supabase delete error (film_shifts)", error);
    throw new ShiftSaveError(error.message);
  }
}

/** Frees a shift back up without deleting it. */
export async function releaseShift(id: string): Promise<void> {
  if (!UUID_RE.test(id)) throw new ShiftSaveError("Invalid shift id");
  const { error } = await client()
    .from("film_shift_signups")
    .delete()
    .eq("shift_id", id);
  if (error) {
    console.error("supabase delete error (film_shift_signups)", error);
    throw new ShiftSaveError(error.message);
  }
}
