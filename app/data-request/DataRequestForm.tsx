"use client";

// app/data-request/DataRequestForm.tsx
//
// Buyer-facing contact form: name, email, message. No email OTP (it's a
// sales lead — see lib/submissions/data-request.ts). Replaces the bare
// mailto links, which do nothing for visitors without a mail client set up.

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { Field, Input, Textarea, ease } from "@/components/form";
import { isValidEmail } from "@/lib/validation";
import { CONTACT_EMAIL } from "@/lib/site";

const EMPTY = { name: "", email: "", message: "" };

export default function DataRequestForm() {
  const [form, setForm] = useState(EMPTY);
  // Honeypot: hidden from people, tempting to bots.
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function update(key: keyof typeof EMPTY, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const valid =
    form.name.trim().length > 1 &&
    isValidEmail(form.email) &&
    form.message.trim().length > 1;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/data-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, website }),
      });
      // Platform errors (413, 504) return HTML, not JSON.
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Something went wrong");
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="mx-auto max-w-xl px-8 py-32 text-center md:py-40"
      >
        <p className="label mb-4 text-flame">Message sent</p>
        <h1 className="display text-5xl md:text-6xl">
          Thanks{form.name ? `, ${form.name.split(/\s+/)[0]}` : ""}.
        </h1>
        <p className="mx-auto mt-6 max-w-md text-lg text-muted">
          We&apos;ve sent a copy to {form.email} and will get back to you soon.
        </p>
        <Link
          href="/"
          className="mt-10 inline-block rounded-full bg-ink px-8 py-4 text-[16px] text-white transition-colors hover:bg-flame"
        >
          Back to home
        </Link>
      </motion.div>
    );
  }

  return (
    <div className="px-4 pb-24 pt-32 sm:pt-36">
      <div className="mx-auto max-w-[620px]">
        <p className="label text-flame">AI and robotics teams</p>
        <h1 className="display mt-4 text-5xl leading-[1.02] md:text-6xl">
          Get in touch.
        </h1>
        <p className="mt-6 text-[17px] leading-relaxed text-muted">
          Looking for data? Send us a message and we&apos;ll get back to you.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-10 space-y-5 rounded-[28px] border border-line p-6 sm:p-10"
          noValidate
        >
          <div className="grid gap-5 sm:grid-cols-2">
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
          </div>
          <Field label="Message" required>
            <Textarea
              rows={6}
              value={form.message}
              onChange={(e) => update("message", e.target.value)}
            />
          </Field>

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
            <p className="rounded-[16px] border border-flame/40 bg-flame/5 px-4 py-3 text-[14px] text-flame">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              type="submit"
              disabled={!valid || submitting}
              className="rounded-full bg-ink px-6 py-3 text-[14.5px] text-white transition-colors enabled:hover:bg-flame disabled:opacity-35"
            >
              {submitting ? "Sending…" : "Send message"}
            </button>
            <p className="text-[13px] text-muted">
              Or email{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-ink underline underline-offset-4"
              >
                {CONTACT_EMAIL}
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
