// app/ops/(workspace)/shifts/page.tsx
//
// Shift board for leadership + project managers: post shifts, reopen or
// delete them, and give filmers /shifts access codes. Same UI as
// /admin → Shifts, backed by app/api/ops/shifts (role-checked + audited).
// The board isn't tied to a project; every project sees the same shifts.

import type { Metadata } from "next";
import ShiftsAdmin from "@/app/admin/ShiftsAdmin";
import { pageData } from "@/lib/ops/page";
import { db } from "@/lib/ops/db";
import { SHIFT_MANAGERS } from "@/lib/ops/shift-auth";
import { fetchAllRows } from "@/lib/supabase-fetch-all";
import { Empty, PageHeader, Panel } from "../../_components/ui";

export const metadata: Metadata = { title: "Shift board" };

export default async function ShiftsPage() {
  const data = await pageData();
  if (!data) return null;
  const { actor } = data;
  if (!(SHIFT_MANAGERS as readonly string[]).includes(actor.role)) {
    return (
      <Panel title="Shift board">
        <Empty>Only leadership and project managers can manage shifts.</Empty>
      </Panel>
    );
  }

  const supabase = db();
  const [shifts, codes] = await Promise.all([
    fetchAllRows((from, to) =>
      supabase
        .from("film_shifts")
        .select("*, film_shift_signups (name, email, phone, created_at)")
        .order("starts_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
    ),
    fetchAllRows((from, to) =>
      supabase
        .from("film_shift_codes")
        .select("*")
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to),
    ),
  ]);
  if (shifts.error) console.error("film_shifts load failed", shifts.error);
  if (codes.error) console.error("film_shift_codes load failed", codes.error);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Shift board"
        sub="Post filming shifts and give filmers access codes for /shifts. The board is shared across projects. Changes made here are recorded in the audit log."
      />
      {shifts.error || codes.error ? (
        <Panel title="Couldn't load the shift board">
          <Empty>{(shifts.error ?? codes.error)?.message}</Empty>
        </Panel>
      ) : (
        <ShiftsAdmin shifts={shifts.data ?? []} codes={codes.data ?? []} api="/api/ops/shifts" />
      )}
    </div>
  );
}
