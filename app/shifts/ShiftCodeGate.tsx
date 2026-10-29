"use client";

// app/shifts/ShiftCodeGate.tsx
//
// First thing filmers see on /shifts: enter the shared code to unlock the
// board. On success the server sets a cookie and we refresh into ShiftBoard.

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Field, Input } from "@/components/form";
import { CONTACT_EMAIL } from "@/lib/site";

export default function ShiftCodeGate({ initialCode = "" }: { initialCode?: string }) {
  const router = useRouter();
  // Prefilled from the ?code= link in the email.
  const [code, setCode] = useState(initialCode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!code.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/shifts/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      // Platform errors (413, 504) return HTML, not JSON.
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Something went wrong");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <div className="px-4 pb-24 pt-32 sm:pt-36">
      <div className="mx-auto max-w-[480px]">
        <p className="label text-flame">Filmers</p>
        <h1 className="display mt-4 text-5xl leading-[1.02] md:text-6xl">
          Enter your code.
        </h1>
        <p className="mt-6 text-[17px] leading-relaxed text-muted">
          The shift board is for our filmers. Enter the code we emailed you to see
          and take shifts.
        </p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-5" noValidate>
          <Field label="Access code" required>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="XXXX-XXXX"
              maxLength={20}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              autoFocus
            />
          </Field>

          {error && (
            <p role="alert" className="rounded-[16px] border border-flame/40 bg-flame/5 px-4 py-3 text-[14px] text-flame">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!code.trim() || submitting}
            className="rounded-full bg-ink px-6 py-3 text-[14.5px] text-white transition-colors enabled:hover:bg-flame disabled:opacity-35"
          >
            {submitting ? "Checking…" : "Continue"}
          </button>
        </form>

        <p className="mt-12 text-[13.5px] text-muted">
          Don&apos;t have a code? Email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-ink underline underline-offset-4">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </div>
    </div>
  );
}
