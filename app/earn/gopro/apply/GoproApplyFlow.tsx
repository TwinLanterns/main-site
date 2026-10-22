"use client";

// app/earn/gopro/apply/GoproApplyFlow.tsx
//
// GoPro home-program sign-up. Same shape as app/earn/apply/EarnApplyFlow.tsx
// (one <form>, stepper advances/submits via onSubmit) but contact details
// only — no screening questions.

import { useEffect, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  EmailVerify,
  Field,
  Input,
  StepHeader,
  StepRail,
  Progress,
  NavButtons,
  TermsAgreement,
  ease,
} from "@/components/form";
import { isValidEmail } from "@/lib/validation";
import { clearReferralCode, loadReferralCode } from "@/lib/referral";

const DRAFT_KEY = "tl-earn-gopro-draft-v1";

const STEPS = ["About you", "Finish"] as const;

interface Draft {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  referredBy: string;
  referrerCollege: string;
}

const EMPTY: Draft = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  referredBy: "",
  referrerCollege: "",
};

function isValidPhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

export default function GoproApplyFlow() {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [refCode, setRefCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ qualified: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  // Deliberately not part of the persisted draft: consent is given fresh at submit.
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      // Restoring from localStorage must happen after mount to avoid an SSR hydration mismatch.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setDraft({ ...EMPTY, ...JSON.parse(saved) });
    } catch {
      // ignore corrupt draft
    }

    setRefCode(loadReferralCode());
    setHydrated(true);
  }, []);

  // Don't write until the saved draft has been read back, or the initial
  // EMPTY state would overwrite it.
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft, hydrated]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  const stepValid = [
    draft.firstName.trim().length > 1 &&
      draft.lastName.trim().length > 0 &&
      isValidEmail(draft.email) &&
      emailVerified &&
      isValidPhone(draft.phone),
    accepted,
  ][step];

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/earn/gopro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: {
            firstName: draft.firstName,
            lastName: draft.lastName,
            email: draft.email,
            phone: draft.phone,
            referredBy: draft.referredBy || undefined,
            referrerCollege: draft.referrerCollege || undefined,
            referredByCode: refCode,
            acceptedTerms: accepted,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Something went wrong");
      setResult({ qualified: data.qualified });
      localStorage.removeItem(DRAFT_KEY);
      clearReferralCode();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    if (!stepValid) return;
    if (step === STEPS.length - 1) {
      handleSubmit();
    } else {
      setStep((s) => Math.min(STEPS.length - 1, s + 1));
    }
  }

  if (result) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="mx-auto max-w-xl px-8 py-32 text-center md:py-40"
      >
        {result.qualified ? (
          <>
            <p className="label mb-4 text-flame">You&apos;re on the list</p>
            <h1 className="display text-5xl md:text-6xl">Welcome to Earn.</h1>
            <p className="mx-auto mt-6 max-w-md text-lg text-muted">
              We&apos;ll email you next steps for the GoPro home program,
              including equipment and scheduling, within a couple of days.
            </p>
          </>
        ) : (
          <>
            <p className="label mb-4 text-muted">Thanks for signing up</p>
            <h1 className="display text-5xl md:text-6xl">We&apos;ll be in touch.</h1>
            <p className="mx-auto mt-6 max-w-md text-lg text-muted">
              Your sign-up doesn&apos;t match what we need for this
              round — we&apos;ll reach out if that changes.
            </p>
          </>
        )}
      </motion.div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-20 md:py-28">
      <Progress value={(step + 1) / STEPS.length} />
      {refCode && <p className="label mt-5 text-muted">Referred by {refCode}</p>}

      <form
        onSubmit={handleFormSubmit}
        className="mt-12 grid gap-12 md:grid-cols-[180px_1fr] md:gap-16"
      >
        <StepRail steps={STEPS} current={step} onJump={setStep} />

        <div>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease }}
            >
              {step === 0 && (
                <>
                  <StepHeader
                    index={0}
                    total={STEPS.length}
                    title="About you"
                    blurb="Who's signing up for the GoPro home program."
                  />
                  <div className="mt-8 grid gap-5 sm:grid-cols-2 sm:gap-6">
                    <Field label="First name" required>
                      <Input
                        value={draft.firstName}
                        onChange={(e) => update("firstName", e.target.value)}
                      />
                    </Field>
                    <Field label="Last name" required>
                      <Input
                        value={draft.lastName}
                        onChange={(e) => update("lastName", e.target.value)}
                      />
                    </Field>
                    <Field label="Email" required>
                      <Input
                        type="email"
                        autoComplete="email"
                        data-1p-ignore
                        data-lpignore="true"
                        value={draft.email}
                        onChange={(e) => update("email", e.target.value)}
                      />
                      <EmailVerify
                        email={draft.email}
                        purpose="earn_gopro"
                        verified={emailVerified}
                        onVerified={setEmailVerified}
                      />
                    </Field>
                    <Field label="Phone" required>
                      <Input
                        type="tel"
                        autoComplete="tel"
                        value={draft.phone}
                        onChange={(e) => update("phone", e.target.value)}
                      />
                    </Field>
                    <Field label="Who referred you" hint="Optional" className="sm:col-span-2">
                      <Input
                        value={draft.referredBy}
                        onChange={(e) => update("referredBy", e.target.value)}
                      />
                    </Field>
                    <Field label="Their college" hint="Optional" className="sm:col-span-2">
                      <Input
                        value={draft.referrerCollege}
                        onChange={(e) => update("referrerCollege", e.target.value)}
                      />
                    </Field>
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <StepHeader
                    index={1}
                    total={STEPS.length}
                    title="Finish"
                    blurb="Review and submit."
                  />
                  <div className="mt-8 space-y-3 text-[14.5px] leading-relaxed text-muted">
                    <p>
                      {draft.firstName} {draft.lastName} · {draft.email} ·{" "}
                      {draft.phone}
                    </p>
                    <p>
                      Referred by: {draft.referredBy || "—"} · College:{" "}
                      {draft.referrerCollege || "—"}
                    </p>
                  </div>
                  <TermsAgreement
                    className="mt-6"
                    checked={accepted}
                    onChange={setAccepted}
                  />
                  {error && (
                    <p className="mt-6 text-[13.5px] text-flame">{error}</p>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>

          <NavButtons
            onBack={() => setStep((s) => Math.max(0, s - 1))}
            backDisabled={step === 0}
            nextLabel={step === STEPS.length - 1 ? "Submit sign-up" : "Continue"}
            nextDisabled={!stepValid}
            loading={submitting}
          />
        </div>
      </form>
    </div>
  );
}
