"use client";

// app/partner/gopro/apply/GoproApplyFlow.tsx
//
// GoPro home-program sign-up. Same shape as app/partner/apply/PartnerApplyFlow.tsx
// (one <form>, stepper advances/submits via onSubmit) but with the home-
// screening questions from the GoPro SOP instead of phone/task questions.

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  EmailVerify,
  Field,
  Input,
  Pills,
  StepHeader,
  StepRail,
  Progress,
  NavButtons,
  ease,
} from "@/components/form";
import { evaluatePartnerGoproEligibility } from "@/lib/submissions/partner-eligibility";
import { isValidEmail } from "@/lib/validation";

const DRAFT_KEY = "tl-partner-gopro-draft-v1";
const REF_KEY = "tl-partner-ref-code";

const STEPS = ["About you", "Your home", "Finish"] as const;

type YesNo = "" | "Yes" | "No";

interface Draft {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  referredBy: string;
  referrerCollege: string;
  isAdult: YesNo;
  hasCoreAreas: YesNo;
  canKeepOthersOut: YesNo;
  weeklyHoursOk: YesNo;
  consent: YesNo;
}

const EMPTY: Draft = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  location: "",
  referredBy: "",
  referrerCollege: "",
  isAdult: "",
  hasCoreAreas: "",
  canKeepOthersOut: "",
  weeklyHoursOk: "",
  consent: "",
};

export default function GoproApplyFlow() {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [refCode, setRefCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ qualified: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) setDraft({ ...EMPTY, ...JSON.parse(saved) });
    } catch {
      // ignore corrupt draft
    }

    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      localStorage.setItem(REF_KEY, ref);
      setRefCode(ref);
    } else {
      setRefCode(localStorage.getItem(REF_KEY));
    }
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

  const eligibility = useMemo(
    () =>
      evaluatePartnerGoproEligibility({
        isAdult: draft.isAdult === "Yes",
        hasCoreAreas: draft.hasCoreAreas === "Yes",
        canKeepOthersOut: draft.canKeepOthersOut === "Yes",
        weeklyHoursOk: draft.weeklyHoursOk === "Yes",
        consent: draft.consent === "Yes",
      }),
    [draft],
  );

  const homeAnswered =
    draft.isAdult !== "" &&
    draft.hasCoreAreas !== "" &&
    draft.canKeepOthersOut !== "" &&
    draft.weeklyHoursOk !== "" &&
    draft.consent !== "";

  const stepValid = [
    draft.firstName.trim().length > 1 &&
      isValidEmail(draft.email) &&
      emailVerified,
    homeAnswered,
    true,
  ][step];

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/partner/gopro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: {
            firstName: draft.firstName,
            lastName: draft.lastName || undefined,
            email: draft.email,
            phone: draft.phone || undefined,
            location: draft.location || undefined,
            referredBy: draft.referredBy || undefined,
            referrerCollege: draft.referrerCollege || undefined,
            isAdult: draft.isAdult === "Yes",
            hasCoreAreas: draft.hasCoreAreas === "Yes",
            canKeepOthersOut: draft.canKeepOthersOut === "Yes",
            weeklyHoursOk: draft.weeklyHoursOk === "Yes",
            consent: draft.consent === "Yes",
            referredByCode: refCode,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Something went wrong");
      setResult({ qualified: data.qualified });
      localStorage.removeItem(DRAFT_KEY);
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
            <h1 className="display text-5xl md:text-6xl">Welcome to Partner.</h1>
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
              Your home or availability doesn&apos;t match what we need for
              this round — we&apos;ll reach out if that changes.
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
                    <Field label="First name">
                      <Input
                        value={draft.firstName}
                        onChange={(e) => update("firstName", e.target.value)}
                      />
                    </Field>
                    <Field label="Last name" hint="Optional">
                      <Input
                        value={draft.lastName}
                        onChange={(e) => update("lastName", e.target.value)}
                      />
                    </Field>
                    <Field label="Email">
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
                        purpose="partner_gopro"
                        verified={emailVerified}
                        onVerified={setEmailVerified}
                      />
                    </Field>
                    <Field label="Phone" hint="Optional">
                      <Input
                        value={draft.phone}
                        onChange={(e) => update("phone", e.target.value)}
                      />
                    </Field>
                    <Field label="Location" hint="City, state" className="sm:col-span-2">
                      <Input
                        value={draft.location}
                        onChange={(e) => update("location", e.target.value)}
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
                    title="Your home"
                    blurb="You'd wear a head-mounted GoPro and record yourself tidying inside your own home. A few quick checks first."
                  />
                  <div className="mt-8 space-y-8">
                    <Field label="Are you 18 or older?">
                      <Pills
                        options={["Yes", "No"]}
                        value={draft.isAdult}
                        onChange={(v) => update("isAdult", v as YesNo)}
                      />
                    </Field>

                    <Field
                      label="Does your home have a kitchen, bedroom, living room, laundry room and dining room?"
                      hint="All five areas are needed."
                    >
                      <Pills
                        options={["Yes", "No"]}
                        value={draft.hasCoreAreas}
                        onChange={(v) => update("hasCoreAreas", v as YesNo)}
                      />
                    </Field>

                    <Field
                      label="Can you keep other people — children in particular — out of frame for every recording?"
                    >
                      <Pills
                        options={["Yes", "No"]}
                        value={draft.canKeepOthersOut}
                        onChange={(v) => update("canKeepOthersOut", v as YesNo)}
                      />
                    </Field>

                    <Field label="Can you record at least 5 hours per week?">
                      <Pills
                        options={["Yes", "No"]}
                        value={draft.weeklyHoursOk}
                        onChange={(v) => update("weeklyHoursOk", v as YesNo)}
                      />
                    </Field>

                    <Field label="Do you consent to being recorded inside your own residence for AI-training purposes?">
                      <Pills
                        options={["Yes", "No"]}
                        value={draft.consent}
                        onChange={(v) => update("consent", v as YesNo)}
                      />
                    </Field>

                    {homeAnswered && !eligibility.qualified && (
                      <p className="text-[13.5px] leading-relaxed text-muted">
                        Heads up — based on your answers this sign-up may not
                        qualify. You can still submit; we keep every sign-up
                        on file.
                      </p>
                    )}
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <StepHeader
                    index={2}
                    total={STEPS.length}
                    title="Finish"
                    blurb="Review and submit."
                  />
                  <div className="mt-8 space-y-3 text-[14.5px] leading-relaxed text-muted">
                    <p>
                      {draft.firstName} {draft.lastName} · {draft.email}
                    </p>
                    <p>{draft.location || "No location given"}</p>
                    <p>
                      Referred by: {draft.referredBy || "—"} · College:{" "}
                      {draft.referrerCollege || "—"}
                    </p>
                  </div>
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
