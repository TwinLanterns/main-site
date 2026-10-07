"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  EmailVerify,
  Field,
  Input,
  NavButtons,
  Pills,
  Progress,
  Select,
  StepHeader,
  StepRail,
  Textarea,
  ease,
} from "@/components/form";
import Mark from "@/components/Mark";
import { isValidEmail } from "@/lib/validation";
import { useDraftState } from "@/lib/useDraftState";

const steps = ["Your company", "The role", "Logistics", "Review"] as const;

const stages = [
  "Pre-seed / idea",
  "Seed",
  "Series A+",
  "Bootstrapped",
  "Nonprofit",
  "Established business",
] as const;
const functions = [
  "Engineering",
  "Growth & marketing",
  "Operations",
  "Finance & analysis",
  "Design",
  "Research",
  "Sales",
  "Customer support",
] as const;
const setups = ["Remote", "Hybrid", "In person"] as const;
const commitments = [
  "10 hrs / wk",
  "20 hrs / wk",
  "30 hrs / wk",
  "Full time",
] as const;
const timelines = [
  "This week",
  "Within 2 weeks",
  "Within a month",
  "Just exploring",
] as const;

type Draft = {
  company: string;
  website: string;
  name: string;
  email: string;
  stage: string;
  team: string;
  fn: string;
  title: string;
  outcome: string;
  setup: string;
  city: string;
  commitment: string;
  pay: string;
  timeline: string;
};

const empty: Draft = {
  company: "",
  website: "",
  name: "",
  email: "",
  stage: "",
  team: "",
  fn: "",
  title: "",
  outcome: "",
  setup: "",
  city: "",
  commitment: "",
  pay: "",
  timeline: "",
};

const KEY = "tl-company-draft";

export default function HireFlow() {
  const [step, setStep] = useState(0);
  const [data, , set] = useDraftState<Draft>(KEY, empty);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);

  const valid = useMemo(() => {
    switch (step) {
      case 0:
        return (
          data.company.trim().length > 1 &&
          data.name.trim().length > 1 &&
          isValidEmail(data.email) &&
          emailVerified &&
          !!data.stage
        );
      case 1:
        return (
          !!data.fn &&
          data.title.trim().length > 1 &&
          data.outcome.trim().length > 19
        );
      case 2:
        return !!data.setup && !!data.commitment && !!data.timeline;
      default:
        return true;
    }
  }, [step, data, emailVerified]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    if (step < steps.length - 1) {
      setStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "company", payload: data }),
      });
      if (!res.ok) throw new Error("bad response");
      localStorage.removeItem(KEY);
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError(
        "Something went wrong sending that. Email hello@twinlanterns.co and we'll pick it up from there.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (done) return <Success company={data.company} />;

  return (
    <div className="relative px-4 pb-24 pt-32 sm:pt-36">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-32 lg:h-max">
          <p className="eyebrow">Role intake</p>
          <h1 className="display mt-3 text-[30px] leading-none">
            Shortlist in 48 hours.
          </h1>
          <div className="mt-6">
            <Progress value={(step + 1) / steps.length} />
          </div>
          <div className="mt-6 hidden lg:block">
            <StepRail steps={steps} current={step} onJump={setStep} />
          </div>
          <p className="mt-8 hidden max-w-[220px] text-[12.5px] leading-relaxed text-muted lg:block">
            This replaces the first half of the intake call. we follow up the
            same day to fill the gaps.
          </p>
        </aside>

        <form
          onSubmit={submit}
          className="rounded-[28px] border border-line p-6 sm:p-10"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease }}
            >
              {step === 0 && (
                <>
                  <StepHeader
                    index={0}
                    total={steps.length}
                    title="Who we'd be working with."
                    blurb="Enough to know the environment a student would be walking into."
                  />
                  <div className="mt-8 grid gap-4 sm:grid-cols-2">
                    <Field label="Company">
                      <Input
                        value={data.company}
                        onChange={(e) => set("company", e.target.value)}
                        placeholder="Northlight Labs"
                      />
                    </Field>
                    <Field label="Website">
                      <Input
                        value={data.website}
                        onChange={(e) => set("website", e.target.value)}
                        placeholder="northlight.co"
                      />
                    </Field>
                    <Field label="Your name">
                      <Input
                        value={data.name}
                        onChange={(e) => set("name", e.target.value)}
                        placeholder="Alex Chen"
                        autoComplete="name"
                      />
                    </Field>
                    <Field label="Work email">
                      <Input
                        type="email"
                        value={data.email}
                        onChange={(e) => set("email", e.target.value)}
                        placeholder="alex@northlight.co"
                        autoComplete="email"
                      />
                      <EmailVerify
                        email={data.email}
                        purpose="company"
                        verified={emailVerified}
                        onVerified={setEmailVerified}
                      />
                    </Field>
                    <Field label="Stage" className="sm:col-span-2">
                      <Pills
                        options={stages}
                        value={data.stage}
                        onChange={(v) => set("stage", v as string)}
                      />
                    </Field>
                    <Field
                      label="Team size"
                      className="sm:col-span-2 sm:max-w-[220px]"
                    >
                      <Select
                        value={data.team}
                        onChange={(e) => set("team", e.target.value)}
                      >
                        <option value="">Select</option>
                        {["1–5", "6–20", "21–50", "51–200", "200+"].map((t) => (
                          <option key={t} value={t}>
                            {t} people
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <StepHeader
                    index={1}
                    total={steps.length}
                    title="The role, in plain words."
                    blurb="You don't need a job description. Describe the problem and we'll write one."
                  />
                  <div className="mt-8 space-y-6">
                    <Field label="Function">
                      <Pills
                        options={functions}
                        value={data.fn}
                        onChange={(v) => set("fn", v as string)}
                      />
                    </Field>
                    <Field label="Working title">
                      <Input
                        value={data.title}
                        onChange={(e) => set("title", e.target.value)}
                        placeholder="Growth intern"
                      />
                    </Field>
                    <Field
                      label="What should be true in three months?"
                      hint={`${data.outcome.trim().length} characters — the outcome, not the tasks.`}
                    >
                      <Textarea
                        rows={5}
                        value={data.outcome}
                        onChange={(e) => set("outcome", e.target.value)}
                        placeholder="Our onboarding emails actually go out on a schedule and someone owns the numbers behind them…"
                      />
                    </Field>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <StepHeader
                    index={2}
                    total={steps.length}
                    title="How it would run."
                    blurb="We filter for these on the first pass, so nobody's time gets wasted."
                  />
                  <div className="mt-8 space-y-6">
                    <div className="grid gap-6 sm:grid-cols-2">
                      <Field label="Setup">
                        <Pills
                          options={setups}
                          value={data.setup}
                          onChange={(v) => set("setup", v as string)}
                        />
                      </Field>
                      <Field label="City" hint="If hybrid or in person.">
                        <Input
                          value={data.city}
                          onChange={(e) => set("city", e.target.value)}
                          placeholder="Los Angeles, CA"
                        />
                      </Field>
                    </div>
                    <Field label="Commitment">
                      <Pills
                        options={commitments}
                        value={data.commitment}
                        onChange={(v) => set("commitment", v as string)}
                      />
                    </Field>
                    <div className="grid gap-6 sm:grid-cols-2">
                      <Field label="Pay" hint="Hourly, stipend, or a range.">
                        <Input
                          value={data.pay}
                          onChange={(e) => set("pay", e.target.value)}
                          placeholder="$22 / hr"
                        />
                      </Field>
                      <Field label="When do you want someone starting?">
                        <Pills
                          options={timelines}
                          value={data.timeline}
                          onChange={(v) => set("timeline", v as string)}
                        />
                      </Field>
                    </div>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <StepHeader
                    index={3}
                    total={steps.length}
                    title="Look it over."
                    blurb="We'll confirm by email within a few hours and book the intake call."
                  />
                  <dl className="mt-8 divide-y divide-line border-y border-line">
                    {[
                      [
                        "Company",
                        `${data.company}${data.website ? ` · ${data.website}` : ""}`,
                      ],
                      ["Contact", `${data.name} · ${data.email}`],
                      [
                        "Stage",
                        `${data.stage}${data.team ? ` · ${data.team} people` : ""}`,
                      ],
                      ["Role", `${data.fn} · ${data.title}`],
                      ["Outcome", data.outcome],
                      [
                        "Setup",
                        `${data.setup}${data.city ? ` · ${data.city}` : ""}`,
                      ],
                      ["Commitment", data.commitment],
                      ["Pay", data.pay || "—"],
                      ["Timeline", data.timeline],
                    ].map(([k, v]) => (
                      <div
                        key={k}
                        className="grid gap-1 py-4 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-6"
                      >
                        <dt className="text-[12.5px] uppercase tracking-wider text-muted">
                          {k}
                        </dt>
                        <dd className="text-[14.5px] leading-relaxed text-ink">
                          {v}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {error && (
                    <p className="mt-6 rounded-[16px] border border-flame/30 bg-flame/5 px-4 py-3 text-[13.5px] text-flame">
                      {error}
                    </p>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>

          <NavButtons
            onBack={() => setStep((s) => Math.max(0, s - 1))}
            backDisabled={step === 0}
            nextDisabled={!valid}
            loading={loading}
            nextLabel={
              step === steps.length - 1 ? "Send the brief" : "Continue"
            }
          />
        </form>
      </div>
    </div>
  );
}

function Success({ company }: { company: string }) {
  return (
    <div className="relative grid min-h-[80vh] place-items-center px-4 py-32">
      {" "}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease }}
        className="max-w-xl text-center"
      >
        <Mark className="mx-auto h-12 w-auto text-ink" />
        <h1 className="display mt-8 text-[clamp(2.4rem,6vw,3.8rem)]">
          Brief received{company ? `, ${company}` : ""}.
        </h1>
        <p className="mx-auto mt-5 max-w-md text-[16px] leading-relaxed text-ink">
          We&apos;ll confirm by email today and put a 30-minute intake call on the
          calendar. First shortlist lands 48 hours after that call.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="rounded-[18px] bg-ink px-6 py-3 text-[14px] text-white"
          >
            Back to home
          </Link>
          <Link
            href="/#how"
            className="rounded-[18px] border border-ink/15 px-6 py-3 text-[14px] transition-colors hover:border-ink/40"
          >
            See what happens next
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
