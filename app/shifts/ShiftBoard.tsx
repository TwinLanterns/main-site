"use client";

// app/shifts/ShiftBoard.tsx
//
// Public shift board: filmers share cameras, so each shift is one camera
// for one time block, and whoever claims it first gets it. Admins create
// shifts in /admin → Shifts.

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Field, Input, ease } from "@/components/form";
import { isValidEmail } from "@/lib/validation";
import { CONTACT_EMAIL } from "@/lib/site";
import {
  SHIFT_TIME_ZONE_LABEL,
  formatShiftDay,
  formatShiftRange,
  shiftDayKey,
} from "@/lib/shift-time";
import type { PublicShift } from "@/lib/submissions/film-shifts";

const EMPTY = { name: "", email: "", phone: "" };

export default function ShiftBoard({ shifts }: { shifts: PublicShift[] | null }) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  // Kept across claims so someone taking several shifts types it once.
  const [form, setForm] = useState(EMPTY);
  // Honeypot: hidden from people, tempting to bots.
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mine, setMine] = useState<Set<string>>(new Set());
  const [justTaken, setJustTaken] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);

  const days = useMemo(() => {
    const groups = new Map<string, PublicShift[]>();
    for (const s of shifts ?? []) {
      const key = shiftDayKey(s.starts_at);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(s);
    }
    return [...groups.values()];
  }, [shifts]);

  const valid =
    form.name.trim().length > 1 &&
    isValidEmail(form.email) &&
    form.phone.replace(/\D/g, "").length >= 7;

  function update(key: keyof typeof EMPTY, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggle(id: string) {
    setOpenId((cur) => (cur === id ? null : id));
    setError(null);
  }

  async function handleSubmit(e: FormEvent, shift: PublicShift) {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/shifts/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, shiftId: shift.id, website }),
      });
      // Platform errors (413, 504) return HTML, not JSON.
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        // Access cookie expired or the code changed: back to the code gate.
        router.refresh();
        return;
      }
      if (res.status === 409) {
        setJustTaken((s) => new Set(s).add(shift.id));
        setOpenId(null);
        setNotice(data.error || "Someone just took that shift. Pick another one.");
        router.refresh();
        return;
      }
      if (!res.ok || !data.ok) throw new Error(data.error || "Something went wrong");
      setMine((s) => new Set(s).add(shift.id));
      setOpenId(null);
      setNotice(
        `You're on for ${formatShiftDay(shift.starts_at)}, ${formatShiftRange(shift.starts_at, shift.ends_at)}. We've emailed the details to ${form.email}.`,
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-4 pb-24 pt-32 sm:pt-36">
      <div className="mx-auto max-w-[720px]">
        <p className="label text-flame">Filmers</p>
        <h1 className="display mt-4 text-5xl leading-[1.02] md:text-6xl">
          Take a shift.
        </h1>
        <p className="mt-6 text-[17px] leading-relaxed text-muted">
          We share cameras, so each shift is one camera for one block of time.
          Pick an open one and it&apos;s yours. All times are {SHIFT_TIME_ZONE_LABEL}.
        </p>

        <AnimatePresence>
          {notice && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease }}
              role="status"
              className="mt-8 rounded-[16px] border border-ink/15 bg-ink/[0.03] px-4 py-3 text-[14.5px] text-ink"
            >
              {notice}
            </motion.p>
          )}
        </AnimatePresence>

        {shifts === null ? (
          <p className="mt-10 rounded-[20px] border border-line p-6 text-[15px] text-muted">
            The schedule couldn&apos;t load right now. Try again in a minute, or
            email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-ink underline underline-offset-4">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        ) : days.length === 0 ? (
          <p className="mt-10 rounded-[20px] border border-line p-6 text-[15px] text-muted">
            No shifts are posted yet. Check back soon.
          </p>
        ) : (
          <div className="mt-12 space-y-10">
            {days.map((day) => (
              <section key={day[0].id}>
                <h2 className="label mb-4">{formatShiftDay(day[0].starts_at)}</h2>
                <ul className="space-y-3">
                  {day.map((s) => {
                    const isMine = mine.has(s.id);
                    const taken = !isMine && (s.taken || justTaken.has(s.id));
                    const open = openId === s.id;
                    return (
                      <li
                        key={s.id}
                        className={`rounded-[22px] border transition-colors ${
                          open ? "border-ink" : "border-line"
                        } ${taken ? "opacity-55" : ""}`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:px-6">
                          <div className="min-w-0">
                            <p className="text-[17px] tabular-nums text-ink">
                              {formatShiftRange(s.starts_at, s.ends_at)}
                            </p>
                            <p className="mt-1 text-[14px] text-muted">
                              {[s.camera, s.location].filter(Boolean).join(" · ")}
                            </p>
                            {s.notes && (
                              <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
                                {s.notes}
                              </p>
                            )}
                          </div>
                          {isMine ? (
                            <span className="rounded-full bg-flame/10 px-4 py-2 text-[13.5px] text-flame">
                              You&apos;re on it
                            </span>
                          ) : taken ? (
                            <span className="rounded-full border border-line px-4 py-2 text-[13.5px] text-muted">
                              Taken
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggle(s.id)}
                              aria-expanded={open}
                              aria-controls={`claim-${s.id}`}
                              className={`rounded-full px-5 py-2.5 text-[14px] transition-colors ${
                                open
                                  ? "border border-line text-ink hover:border-ink"
                                  : "bg-ink text-white hover:bg-flame"
                              }`}
                            >
                              {open ? "Cancel" : "Take this shift"}
                              <span className="sr-only">
                                , {formatShiftDay(s.starts_at)}{" "}
                                {formatShiftRange(s.starts_at, s.ends_at)}
                              </span>
                            </button>
                          )}
                        </div>

                        <AnimatePresence initial={false}>
                          {open && (
                            <motion.form
                              id={`claim-${s.id}`}
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease }}
                              onSubmit={(e) => handleSubmit(e, s)}
                              className="overflow-hidden"
                              noValidate
                            >
                              <div className="space-y-5 border-t border-line p-5 sm:px-6">
                                <div className="grid gap-5 sm:grid-cols-3">
                                  <Field label="Your name" required>
                                    <Input
                                      value={form.name}
                                      onChange={(e) => update("name", e.target.value)}
                                      autoComplete="name"
                                    />
                                  </Field>
                                  <Field label="Email" required>
                                    <Input
                                      type="email"
                                      value={form.email}
                                      onChange={(e) => update("email", e.target.value)}
                                      autoComplete="email"
                                    />
                                  </Field>
                                  <Field label="Phone" required>
                                    <Input
                                      type="tel"
                                      value={form.phone}
                                      onChange={(e) => update("phone", e.target.value)}
                                      autoComplete="tel"
                                    />
                                  </Field>
                                </div>

                                {/* Honeypot — visually hidden and skipped by keyboard/AT. */}
                                <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
                                  <label>
                                    Website
                                    <input
                                      tabIndex={-1}
                                      autoComplete="off"
                                      value={website}
                                      onChange={(e) => setWebsite(e.target.value)}
                                    />
                                  </label>
                                </div>

                                {error && (
                                  <p role="alert" className="rounded-[16px] border border-flame/40 bg-flame/5 px-4 py-3 text-[14px] text-flame">
                                    {error}
                                  </p>
                                )}

                                <button
                                  type="submit"
                                  disabled={!valid || submitting}
                                  className="rounded-full bg-ink px-6 py-3 text-[14.5px] text-white transition-colors enabled:hover:bg-flame disabled:opacity-35"
                                >
                                  {submitting ? "Saving…" : "Confirm shift"}
                                </button>
                              </div>
                            </motion.form>
                          )}
                        </AnimatePresence>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}

        <p className="mt-12 text-[13.5px] text-muted">
          Can&apos;t make a shift you took? Email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-ink underline underline-offset-4">
            {CONTACT_EMAIL}
          </a>{" "}
          as early as you can so we can pass the camera on.
        </p>
      </div>
    </div>
  );
}
