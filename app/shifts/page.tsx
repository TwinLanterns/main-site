import type { Metadata } from "next";
import { cookies } from "next/headers";
import { listUpcomingShifts, type PublicShift } from "@/lib/submissions/film-shifts";
import { SHIFT_ACCESS_COOKIE, hasShiftAccess } from "@/lib/shift-access";
import ShiftBoard from "./ShiftBoard";
import ShiftCodeGate from "./ShiftCodeGate";

// Claims change by the minute; never serve a cached board.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Filming shifts",
  description: "Pick a filming shift with Twin Lanterns.",
  // Shared directly with filmers, not meant to be found through search.
  robots: { index: false, follow: false },
};

export default async function ShiftsPage() {
  const token = (await cookies()).get(SHIFT_ACCESS_COOKIE)?.value;
  // Don't load (or leak) the schedule until the code has been entered.
  if (!(await hasShiftAccess(token))) return <ShiftCodeGate />;

  let shifts: PublicShift[] | null = null;
  try {
    shifts = await listUpcomingShifts();
  } catch (err) {
    // e.g. supabase/film_shifts.sql not run yet.
    console.error("shift board load failed", err);
  }
  return <ShiftBoard shifts={shifts} />;
}
