"use client";

// app/admin/ShiftsAdmin.tsx
//
// Shifts tab: post filming shifts (one per camera per time block), see who
// took each one, and free up or delete shifts. Filmers claim them at /shifts
// after entering an access code (ShiftCodesAdmin).

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  SHIFT_TIME_ZONE_LABEL,
  formatShiftDay,
  formatShiftRange,
} from "@/lib/shift-time";
import ShiftCodesAdmin from "./ShiftCodesAdmin";

type Row = Record<string, unknown>;

type Signup = { name: string; email: string; phone: string; created_at: string };

const input =
  "w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none";

function signupOf(row: Row): Signup | null {
  const s = row.film_shift_signups;
  const one = Array.isArray(s) ? s[0] : s;
  return one && typeof one === "object" ? (one as Signup) : null;
}

export default function ShiftsAdmin({ shifts, codes }: { shifts: Row[]; codes: Row[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    date: "",
    start: "",
    end: "",
    cameras: "Camera 1",
    location: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);
  const [copied, setCopied] = useState(false);
  const [now] = useState(() => Date.now());

  const { upcoming, past } = useMemo(() => {
    const upcoming: Row[] = [];
    const past: Row[] = [];
    for (const r of shifts) {
      (new Date(String(r.ends_at)).getTime() > now ? upcoming : past).push(r);
    }
    past.reverse();
    return { upcoming, past };
  }, [shifts, now]);

  const shown = showPast ? past : upcoming;
  const openCount = upcoming.filter((r) => !signupOf(r)).length;

  async function send(method: "POST" | "DELETE", body: object) {
    const res = await fetch("/api/admin/shifts", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.error || "Something went wrong");
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await send("POST", form);
      // Keep camera/location for the next block; clear the times.
      setForm((f) => ({ ...f, start: "", end: "" }));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function act(id: string, release: boolean, confirmText: string) {
    if (!window.confirm(confirmText)) return;
    setBusyId(id);
    setError(null);
    try {
      await send("DELETE", { id, release });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusyId(null);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/shifts`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked; the link is visible next to the button anyway.
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white p-4">
        <p className="text-sm text-neutral-600">
          Filmers sign up at{" "}
          <a href="/shifts" target="_blank" className="font-medium text-neutral-900 underline">
            /shifts
          </a>
          . {upcoming.length} upcoming · {openCount} open ·{" "}
          {upcoming.length - openCount} taken · {codes.length} with codes
        </p>
        <button
          onClick={copyLink}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-neutral-500"
        >
          {copied ? "Copied" : "Copy sign-up link"}
        </button>
      </div>

      <ShiftCodesAdmin codes={codes} />

      <form
        onSubmit={handleCreate}
        className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4"
      >
        <p className="text-sm font-medium text-neutral-900">
          Add shifts{" "}
          <span className="font-normal text-neutral-500">
            ({SHIFT_TIME_ZONE_LABEL})
          </span>
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs text-neutral-500">
            Date
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className={input}
            />
          </label>
          <label className="text-xs text-neutral-500">
            Start
            <input
              type="time"
              required
              value={form.start}
              onChange={(e) => setForm({ ...form, start: e.target.value })}
              className={input}
            />
          </label>
          <label className="text-xs text-neutral-500">
            End
            <input
              type="time"
              required
              value={form.end}
              onChange={(e) => setForm({ ...form, end: e.target.value })}
              className={input}
            />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-neutral-500">
            Cameras — comma-separated, one shift each
            <input
              required
              value={form.cameras}
              onChange={(e) => setForm({ ...form, cameras: e.target.value })}
              placeholder="Camera 1, Camera 2"
              className={input}
            />
          </label>
          <label className="text-xs text-neutral-500">
            Location (optional)
            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className={input}
            />
          </label>
        </div>
        <label className="block text-xs text-neutral-500">
          Notes for filmers (optional)
          <input
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="e.g. pick up the camera from the front desk"
            className={input}
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {saving ? "Adding…" : "Add shifts"}
        </button>
      </form>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        {[false, true].map((p) => (
          <button
            key={String(p)}
            onClick={() => setShowPast(p)}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
              showPast === p
                ? "border-neutral-900 text-neutral-900"
                : "border-neutral-300 text-neutral-500 hover:border-neutral-500"
            }`}
          >
            {p ? `Past (${past.length})` : `Upcoming (${upcoming.length})`}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-500">
            <tr>
              <th className="px-3 py-2 font-medium">Day</th>
              <th className="px-3 py-2 font-medium">Time</th>
              <th className="px-3 py-2 font-medium">Camera</th>
              <th className="px-3 py-2 font-medium">Location</th>
              <th className="px-3 py-2 font-medium">Filmer</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-neutral-500">
                  {showPast ? "No past shifts." : "No upcoming shifts. Add some above."}
                </td>
              </tr>
            )}
            {shown.map((r) => {
              const id = String(r.id);
              const start = String(r.starts_at);
              const signup = signupOf(r);
              const busy = busyId === id;
              return (
                <tr key={id} className="border-b border-neutral-100 align-top last:border-0">
                  <td className="whitespace-nowrap px-3 py-2">{formatShiftDay(start)}</td>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                    {formatShiftRange(start, String(r.ends_at))}
                  </td>
                  <td className="px-3 py-2">{String(r.camera ?? "")}</td>
                  <td className="px-3 py-2 text-neutral-600">{String(r.location ?? "")}</td>
                  <td className="px-3 py-2">
                    {signup ? (
                      <div>
                        <p className="font-medium text-neutral-900">{signup.name}</p>
                        <p className="text-xs text-neutral-500">
                          <a href={`mailto:${signup.email}`} className="hover:underline">
                            {signup.email}
                          </a>{" "}
                          ·{" "}
                          <a href={`tel:${signup.phone}`} className="hover:underline">
                            {signup.phone}
                          </a>
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs font-medium text-emerald-700">Open</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    {signup && (
                      <button
                        disabled={busy}
                        onClick={() =>
                          act(id, true, `Remove ${signup.name} and reopen this shift?`)
                        }
                        className="mr-3 text-xs text-neutral-500 hover:text-neutral-900 disabled:opacity-50"
                      >
                        Reopen
                      </button>
                    )}
                    <button
                      disabled={busy}
                      onClick={() =>
                        act(
                          id,
                          false,
                          signup
                            ? `Delete this shift? ${signup.name} is signed up for it.`
                            : "Delete this shift?",
                        )
                      }
                      className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
