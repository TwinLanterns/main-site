"use client";

// app/partner/apply/PartnerApplyFlow.tsx
//
// 4-step wizard on components/form.tsx's real primitives. NavButtons'
// "Next" is a native <button type="submit">, so the whole stepper lives
// inside one <form onSubmit>; advancing a step vs. submitting the
// application are both just that form's onSubmit handler branching on
// whether we're on the last step.

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  EmailVerify,
  Field,
  Input,
  Pills,
  ChoiceCards,
  StepHeader,
  StepRail,
  Progress,
  NavButtons,
  ease,
} from "@/components/form";
import {
  PARTNER_DEVICES,
  PARTNER_TASK_CATEGORIES,
  evaluatePartnerEligibility,
  type DeviceOs,
} from "@/lib/submissions/partner-eligibility";

const DRAFT_KEY = "tl-partner-draft-v1";
const REF_KEY = "tl-partner-ref-code";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const STEPS = ["About you", "Eligibility", "Tasks", "Finish"] as const;

// ChoiceCards' `kind`/`color` shape, cycled across the task categories so
// each card gets a distinct Shape + accent without hand-assigning 15 of them.
const CARD_KINDS = ["clover", "hex", "scallop", "arch", "squircle", "burst"] as const;
const CARD_COLORS = [
  "text-flame",
  "text-sky",
  "text-lilac",
  "text-lime",
  "text-blush",
  "text-lemon",
] as const;

const TASK_CHOICES = PARTNER_TASK_CATEGORIES.map((label, i) => ({
  label,
  kind: CARD_KINDS[i % CARD_KINDS.length],
  color: CARD_COLORS[i % CARD_COLORS.length],
}));

type YesNo = "" | "Yes" | "No";

interface Draft {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  referredBy: string;
  referrerCollege: string;
  deviceOsLabel: "" | "iOS" | "Android" | "Neither";
  deviceModel: string;
  filmingAck: YesNo;
  consent: YesNo;
  taskInterests: string[];
}

const EMPTY: Draft = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  location: "",
  referredBy: "",
  referrerCollege: "",
  deviceOsLabel: "",
  deviceModel: "",
  filmingAck: "",
  consent: "",
  taskInterests: [],
};

function toDeviceOs(label: Draft["deviceOsLabel"]): DeviceOs | "" {
  if (label === "iOS") return "ios";
  if (label === "Android") return "android";
  return "";
}

export default function PartnerApplyFlow() {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY);
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
  }, []);

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  const deviceOptions = useMemo(() => {
    if (draft.deviceOsLabel === "iOS") return PARTNER_DEVICES.ios;
    if (draft.deviceOsLabel === "Android") return PARTNER_DEVICES.android;
    return [];
  }, [draft.deviceOsLabel]);

  const eligibility = useMemo(
    () =>
      evaluatePartnerEligibility({
        deviceOs: toDeviceOs(draft.deviceOsLabel),
        deviceModel: draft.deviceModel,
        filmingAck: draft.filmingAck === "Yes",
        consent: draft.consent === "Yes",
      }),
    [draft],
  );

  const MODEL_OTHER = "Other";

    // inside the component, replace the stepValid block:
    const deviceReady =
    draft.deviceOsLabel === "Neither" ||
    ((draft.deviceOsLabel === "iOS" || draft.deviceOsLabel === "Android") &&
        Boolean(draft.deviceModel));

    const stepValid = [
    draft.firstName.trim().length > 1 && EMAIL_RE.test(draft.email) && emailVerified,
    deviceReady && draft.filmingAck !== "" && draft.consent !== "",
    draft.taskInterests.length > 0,
    true,
    ][step];

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/partner/submit", {
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
            deviceOs: toDeviceOs(draft.deviceOsLabel),
            deviceModel: draft.deviceModel,
            taskInterests: draft.taskInterests,
            filmingAck: draft.filmingAck === "Yes",
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
            <p className="label mb-4 text-flame">You&apos;re in</p>
            <h1 className="display text-5xl md:text-6xl">Welcome to Partner.</h1>
            <p className="mx-auto mt-6 max-w-md text-lg text-muted">
              We&apos;ll email you next steps for recording your first task
              within a couple of days.
            </p>
          </>
        ) : (
          <>
            <p className="label mb-4 text-muted">Thanks for applying</p>
            <h1 className="display text-5xl md:text-6xl">We&apos;ll be in touch.</h1>
            <p className="mx-auto mt-6 max-w-md text-lg text-muted">
              Your device or setup doesn&apos;t match what we need for this
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
                    blurb="Who's applying to film for Partner."
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
                        purpose="partner_applicant"
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
                    title="Eligibility"
                    blurb="Partner tasks are filmed head-mounted, standing, with both hands visible — here's what we need to check first."
                  />
                  <div className="mt-8 space-y-8">
                    <Field label="Phone type">
                        <Pills
                            options={["iOS", "Android", "Neither"]}
                            value={draft.deviceOsLabel}
                            onChange={(v) => {
                            update("deviceOsLabel", v as Draft["deviceOsLabel"]);
                            update("deviceModel", "");
                            }}
                        />
                        </Field>

                        {(draft.deviceOsLabel === "iOS" || draft.deviceOsLabel === "Android") && (
                        <Field
                            label="Model"
                            hint="Pick the closest match. If yours isn't listed, choose Other."
                        >
                            <Pills
                            options={[...deviceOptions, MODEL_OTHER]}
                            value={draft.deviceModel}
                            onChange={(v) => update("deviceModel", v as string)}
                            />
                        </Field>
                        )}

                        <Field
                        label="Can you film head-mounted and standing, with both hands visible about 90% of the time?"
                        hint="No chest mounts, no seated tasks."
                        >
                        <Pills
                            options={["Yes", "No"]}
                            value={draft.filmingAck}
                            onChange={(v) => update("filmingAck", v as YesNo)}
                        />
                        </Field>

                        <Field label="Do you consent to being filmed performing this task in a non-household setting?">
                        <Pills
                            options={["Yes", "No"]}
                            value={draft.consent}
                            onChange={(v) => update("consent", v as YesNo)}
                        />
                        </Field>

                        {draft.deviceOsLabel !== "" &&
                        (draft.deviceOsLabel === "Neither" || Boolean(draft.deviceModel)) &&
                        draft.filmingAck !== "" &&
                        draft.consent !== "" &&
                        !eligibility.qualified && (
                            <p className="text-[13.5px] leading-relaxed text-muted">
                            Heads up — based on your answers this application may not qualify.
                            You can still submit; we keep every application on file.
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
                    title="Tasks"
                    blurb="Pick every category you could realistically film."
                  />
                  <div className="mt-8">
                    <ChoiceCards
                      options={TASK_CHOICES}
                      value={draft.taskInterests}
                      multi
                      onChange={(v) => update("taskInterests", v as string[])}
                    />
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
                    <p>{draft.deviceModel || "No device selected"}</p>
                    <p>{draft.taskInterests.join(", ") || "No tasks selected"}</p>
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
            nextLabel={step === STEPS.length - 1 ? "Submit application" : "Continue"}
            nextDisabled={!stepValid}
            loading={submitting}
          />
        </div>
      </form>
    </div>
  );
}