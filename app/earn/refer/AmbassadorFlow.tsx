"use client";

// app/earn/refer/AmbassadorFlow.tsx
//
// Single-step sign-up wrapped in a <form> so NavButtons' submit button
// works the same way it does in the multi-step wizards — there's just
// only one step to advance past before it calls the API.

import { useState, type FormEvent } from "react";
import { motion } from "motion/react";
import {
  EmailVerify,
  Field,
  Input,
  NavButtons,
  TermsAgreement,
  ease,
} from "@/components/form";

export default function AmbassadorFlow() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const valid =
    name.trim().length > 1 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) &&
    emailVerified &&
    accepted;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/earn/refer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, acceptedTerms: accepted }),
      });
      // Platform errors (413, 504) return HTML, not JSON.
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Something went wrong");
      setCode(data.code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (code) {
    const link = `${window.location.origin}/earn/apply?ref=${code}`;
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="mx-auto max-w-xl px-8 py-32 text-center md:py-40"
      >
        <p className="label mb-4 text-flame">You&apos;re an ambassador</p>
        <h1 className="display text-5xl md:text-6xl">Share your link.</h1>
        <p className="mx-auto mt-6 max-w-md text-lg text-muted">
          Anyone who applies through this link is credited to you.
        </p>
        <div className="mx-auto mt-10 flex max-w-lg items-center gap-3 rounded-full border border-line bg-shell px-6 py-4">
          <span className="flex-1 truncate text-[14px]">{link}</span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(link);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="label shrink-0 text-flame"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-8 py-28 md:py-36">
      <p className="label mb-4 text-flame">Earn ambassadors</p>
      <h1 className="display text-5xl md:text-6xl">Refer good people, get paid.</h1>
      <p className="mt-6 max-w-lg text-lg text-muted">
        Drop your details and we&apos;ll give you a link to share. Every
        qualified applicant you send our way earns a payout once they
        complete their first task.
      </p>

      <form onSubmit={handleSubmit} className="mt-12">
        <div className="space-y-6">
          <Field label="Your name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Your email" required>
            <Input
              type="email"
              autoComplete="email"
              data-1p-ignore
              data-lpignore="true"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <EmailVerify
              email={email}
              purpose="earn_ambassador"
              verified={emailVerified}
              onVerified={setEmailVerified}
            />
          </Field>
          <TermsAgreement checked={accepted} onChange={setAccepted} />
          {error && <p className="text-[13.5px] text-flame">{error}</p>}
        </div>

        <NavButtons
          onBack={() => {}}
          backDisabled
          nextLabel="Get my link"
          nextDisabled={!valid}
          loading={submitting}
        />
      </form>
    </div>
  );
}