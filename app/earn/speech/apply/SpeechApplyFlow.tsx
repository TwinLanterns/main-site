"use client";

// app/earn/speech/apply/SpeechApplyFlow.tsx
//
// Speech-conversation program sign-up. Same shape as
// app/earn/gopro/apply/GoproApplyFlow.tsx (one <form>, stepper advances or
// submits via onSubmit) with background questions used to balance the group.

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
import {
  EARN_SPEECH_ACCENTS,
  EARN_SPEECH_MIN_AGE,
  EARN_SPEECH_RACE,
  EARN_SPEECH_SEX,
  evaluateEarnSpeechEligibility,
} from "@/lib/submissions/earn-eligibility";
import { isValidEmail } from "@/lib/validation";

const DRAFT_KEY = "tl-earn-speech-draft-v1";
const REF_KEY = "tl-earn-ref-code";

const STEPS = ["About you", "Background", "Participation", "Finish"] as const;

const NOT_SURE = "Not sure";
const SKIP = "Prefer not to say";

type YesNo = "" | "Yes" | "No";

interface Draft {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  referredBy: string;
  referrerCollege: string;
  age: string;
  sex: string;
  raceEthnicity: string;
  accent: string;
  region: string;
  firstLanguageEnglish: YesNo;
  guardianConsent: YesNo;
  availabilityOk: YesNo;
  consent: YesNo;
}

const EMPTY: Draft = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  referredBy: "",
  referrerCollege: "",
  age: "",
  sex: "",
  raceEthnicity: "",
  accent: "",
  region: "",
  firstLanguageEnglish: "",
  guardianConsent: "",
  availabilityOk: "",
  consent: "",
};

function parseAge(raw: string): number | null {
  const n = Number.parseInt(raw, 10);
  return Number.isInteger(n) && n > 0 && n < 120 ? n : null;
}

export default function SpeechApplyFlow() {
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

  const age = parseAge(draft.age);
  const isMinor = age !== null && age >= EARN_SPEECH_MIN_AGE && age < 18;

  const eligibility = useMemo(
    () =>
      evaluateEarnSpeechEligibility({
        age,
        guardianConsent: draft.guardianConsent === "Yes",
        availabilityOk: draft.availabilityOk === "Yes",
        consent: draft.consent === "Yes",
      }),
    [age, draft.guardianConsent, draft.availabilityOk, draft.consent],
  );

  const backgroundDone =
    age !== null &&
    draft.sex !== "" &&
    draft.raceEthnicity !== "" &&
    draft.accent !== "" &&
    draft.firstLanguageEnglish !== "";

  const participationDone =
    draft.availabilityOk !== "" &&
    draft.consent !== "" &&
    (!isMinor || draft.guardianConsent !== "");

  const stepValid = [
    draft.firstName.trim().length > 1 &&
      isValidEmail(draft.email) &&
      emailVerified,
    backgroundDone,
    participationDone,
    true,
  ][step];

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/earn/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: {
            firstName: draft.firstName,
            lastName: draft.lastName || undefined,
            email: draft.email,
            phone: draft.phone || undefined,
            referredBy: draft.referredBy || undefined,
            referrerCollege: draft.referrerCollege || undefined,
            age,
            sex: draft.sex,
            raceEthnicity: draft.raceEthnicity,
            accent: draft.accent,
            region: draft.region || undefined,
            firstLanguageEnglish: draft.firstLanguageEnglish === "Yes",
            guardianConsent: isMinor && draft.guardianConsent === "Yes",
            availabilityOk: draft.availabilityOk === "Yes",
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
            <h1 className="display text-5xl md:text-6xl">Welcome to Earn.</h1>
            <p className="mx-auto mt-6 max-w-md text-lg text-muted">
              We&apos;ll email you next steps for the speech program —
              consent paperwork, scheduling and compensation details — as
              soon as the next group opens.
            </p>
          </>
        ) : (
          <>
            <p className="label mb-4 text-muted">Thanks for signing up</p>
            <h1 className="display text-5xl md:text-6xl">We&apos;ll be in touch.</h1>
            <p className="mx-auto mt-6 max-w-md text-lg text-muted">
              Your sign-up doesn&apos;t match what we need for this round —
              we&apos;ll reach out if that changes.
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
                    blurb="Who's signing up for the speech program."
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
                        purpose="earn_speech"
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
                    title="Background"
                    blurb="We're building a group with a wide range of voices. These answers are self-reported and only used to balance the group."
                  />
                  <div className="mt-8 space-y-8">
                    <Field
                      label="How old are you?"
                      hint={`Participants must be ${EARN_SPEECH_MIN_AGE} or older.`}
                    >
                      <Input
                        inputMode="numeric"
                        maxLength={3}
                        value={draft.age}
                        onChange={(e) =>
                          update("age", e.target.value.replace(/\D/g, ""))
                        }
                      />
                    </Field>

                    <Field label="Sex">
                      <Pills
                        options={[...EARN_SPEECH_SEX]}
                        value={draft.sex}
                        onChange={(v) => update("sex", v as string)}
                      />
                    </Field>

                    <Field label="Race / ethnicity" hint="Select the one that fits best.">
                      <Pills
                        options={[...EARN_SPEECH_RACE, SKIP]}
                        value={draft.raceEthnicity}
                        onChange={(v) => update("raceEthnicity", v as string)}
                      />
                    </Field>

                    <Field
                      label="Which accent region best describes how you speak?"
                      hint="Where you grew up is usually the best guide."
                    >
                      <Pills
                        options={[...EARN_SPEECH_ACCENTS, NOT_SURE]}
                        value={draft.accent}
                        onChange={(v) => update("accent", v as string)}
                      />
                    </Field>

                    <Field label="State or metro area" hint="Optional — helps us check accent fit">
                      <Input
                        value={draft.region}
                        onChange={(e) => update("region", e.target.value)}
                      />
                    </Field>

                    <Field label="Is English your first language?">
                      <Pills
                        options={["Yes", "No"]}
                        value={draft.firstLanguageEnglish}
                        onChange={(v) => update("firstLanguageEnglish", v as YesNo)}
                      />
                    </Field>

                    {age !== null && age < EARN_SPEECH_MIN_AGE && (
                      <p className="text-[13.5px] leading-relaxed text-muted">
                        Heads up — this program is for people aged{" "}
                        {EARN_SPEECH_MIN_AGE} and older, so this sign-up may
                        not qualify. You can still submit; we keep every
                        sign-up on file.
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
                    title="Participation"
                    blurb="You'd have natural two-person conversations, indoors and outdoors, on a chest-mounted body camera we supply."
                  />
                  <div className="mt-8 space-y-8">
                    <Field
                      label="Can you join several recording sessions, both indoors and outdoors?"
                      hint="About 30 minutes of your own speech in total — roughly two hours of conversation across multiple sessions."
                    >
                      <Pills
                        options={["Yes", "No"]}
                        value={draft.availabilityOk}
                        onChange={(v) => update("availabilityOk", v as YesNo)}
                      />
                    </Field>

                    <Field
                      label="Do you consent to your audio and video being recorded, and your voice recordings being used to train and evaluate speech-recognition systems?"
                      hint="You'll sign a formal release before any recording begins."
                    >
                      <Pills
                        options={["Yes", "No"]}
                        value={draft.consent}
                        onChange={(v) => update("consent", v as YesNo)}
                      />
                    </Field>

                    {isMinor && (
                      <Field
                        label="Will a parent or legal guardian give written consent for you to take part?"
                        hint="Required for participants under 18."
                      >
                        <Pills
                          options={["Yes", "No"]}
                          value={draft.guardianConsent}
                          onChange={(v) => update("guardianConsent", v as YesNo)}
                        />
                      </Field>
                    )}

                    {participationDone && !eligibility.qualified && (
                      <p className="text-[13.5px] leading-relaxed text-muted">
                        Heads up — based on your answers this sign-up may not
                        qualify. You can still submit; we keep every sign-up
                        on file.
                      </p>
                    )}
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <StepHeader
                    index={3}
                    total={STEPS.length}
                    title="Finish"
                    blurb="Review and submit."
                  />
                  <div className="mt-8 space-y-3 text-[14.5px] leading-relaxed text-muted">
                    <p>
                      {draft.firstName} {draft.lastName} · {draft.email}
                    </p>
                    <p>
                      Age {age ?? "—"} · {draft.sex || "—"} ·{" "}
                      {draft.raceEthnicity || "—"} · {draft.accent || "—"} accent
                    </p>
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
