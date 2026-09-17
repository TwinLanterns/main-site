"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ChoiceCards,
  DropZone,
  EmailVerify,
  Field,
  Input,
  NavButtons,
  Pills,
  Progress,
  RankList,
  Select,
  Slider,
  StepHeader,
  StepRail,
  Textarea,
  ease,
  type Upload,
} from "@/components/form";
import Shape from "@/components/Shapes";

const steps = [
  "Interests",
  "Availability",
  "Priorities",
  "About you",
  "Finish",
] as const;

const interests = [
  { label: "Software engineering", kind: "clover", color: "text-flame" },
  { label: "Growth & marketing", kind: "scallop", color: "text-sky" },
  { label: "Operations", kind: "hex", color: "text-lemon" },
  { label: "Finance & analysis", kind: "burst", color: "text-lilac" },
  { label: "Design & brand", kind: "squircle", color: "text-blush" },
  { label: "Research", kind: "arch", color: "text-lime" },
] as const;

const levels = [
  "High school",
  "Undergraduate",
  "Graduate",
  "Gap year",
] as const;
const setups = ["Remote", "Hybrid", "In person", "No preference"] as const;
const defaultPriorities = [
  "Getting paid well",
  "Learning from someone good",
  "Work I can put my name on",
  "Flexible hours",
  "A company I'd brag about",
];

type Draft = {
  interests: string[];
  hours: number;
  setup: string;
  startWeeks: number;
  priorities: string[];
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  level: string;
  school: string;
  gradYear: string;
  location: string;
  built: string;
  links: string;
};

const empty: Draft = {
  interests: [],
  hours: 10,
  setup: "",
  startWeeks: 2,
  priorities: defaultPriorities,
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  level: "",
  school: "",
  gradYear: "",
  location: "",
  built: "",
  links: "",
};

const KEY = "tl-student-draft-v2";
const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

export default function ApplyFlow() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Draft>(empty);
  const [file, setFile] = useState<Upload>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setData({ ...empty, ...JSON.parse(raw) });
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {}
  }, [data]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const valid = useMemo(() => {
    switch (step) {
      case 0:
        return data.interests.length > 0;
      case 1:
        return !!data.setup;
      case 2:
        return true;
      case 3:
        return (
          data.firstName.trim().length > 1 &&
          emailOk(data.email) &&
          emailVerified &&
          !!data.level &&
          data.school.trim().length > 1
        );
      default:
        return data.built.trim().length > 19;
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
        body: JSON.stringify({
          kind: "student",
          payload: {
            ...data,
            hours: data.hours >= 40 ? "Full time" : `${data.hours} hrs / week`,
            startWeeks:
              data.startWeeks === 0
                ? "Right now"
                : `In about ${data.startWeeks} week${data.startWeeks > 1 ? "s" : ""}`,
            priorities: data.priorities.map((p, i) => `${i + 1}. ${p}`),
            resume: file?.name ?? "—",
          },
          attachment: file,
        }),
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

  if (done) return <Success name={data.firstName} />;

  return (
    <div className="px-4 pb-24 pt-32 sm:pt-36">
      <div className="mx-auto grid max-w-[1120px] gap-10 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-32 lg:h-max">
          <p className="label">Student application</p>
          <h1 className="display mt-3 text-[32px] leading-none">
            Four minutes, once.
          </h1>
          <div className="mt-6">
            <Progress value={(step + 1) / steps.length} />
          </div>
          <div className="mt-6 hidden lg:block">
            <StepRail steps={steps} current={step} onJump={setStep} />
          </div>
          <p className="mt-8 hidden max-w-[210px] text-[13px] leading-relaxed text-muted lg:block">
            Your draft saves in this browser as you type. Nothing is sent until
            you hit submit.
          </p>
        </aside>

        <form
          onSubmit={submit}
          className="rounded-[28px] border border-line p-6 sm:p-10"
        >
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
                    total={steps.length}
                    title="What kind of work pulls you in?"
                    blurb="Tap everything that appeals. We'd rather over-match than miss you."
                  />
                  <div className="mt-8">
                    <ChoiceCards
                      multi
                      options={interests}
                      value={data.interests}
                      onChange={(v) => set("interests", v as string[])}
                    />
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <StepHeader
                    index={1}
                    total={steps.length}
                    title="How much time do you have?"
                    blurb="Be realistic — we hold companies to whatever you set here."
                  />
                  <div className="mt-9 space-y-11">
                    <div>
                      <p className="mb-3 text-[14px]">Hours a week</p>
                      <Slider
                        value={data.hours}
                        onChange={(v) => set("hours", v)}
                        min={5}
                        max={40}
                        step={5}
                        format={(v) =>
                          v >= 40 ? "Full time" : `${v} hrs / week`
                        }
                        ticks={["5", "15", "25", "40"]}
                      />
                    </div>
                    <div>
                      <p className="mb-3 text-[14px]">
                        How soon could you start?
                      </p>
                      <Slider
                        value={data.startWeeks}
                        onChange={(v) => set("startWeeks", v)}
                        min={0}
                        max={12}
                        step={1}
                        format={(v) =>
                          v === 0
                            ? "Right now"
                            : `In ${v} week${v > 1 ? "s" : ""}`
                        }
                        ticks={["Now", "4 weeks", "8 weeks", "12 weeks"]}
                      />
                    </div>
                    <Field label="Where you'd work">
                      <Pills
                        options={setups}
                        value={data.setup}
                        onChange={(v) => set("setup", v as string)}
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
                    title="What matters most to you?"
                    blurb="Put them in your own order — most important at the top. It is what we optimise for when we match you."
                  />
                  <div className="mt-8">
                    <RankList
                      items={data.priorities}
                      onChange={(v) => set("priorities", v)}
                    />
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <StepHeader
                    index={3}
                    total={steps.length}
                    title="Who are you?"
                    blurb="No account, no password. Just enough to reach you."
                  />
                  <div className="mt-8 grid gap-4 sm:grid-cols-2">
                    <Field label="First name">
                      <Input
                        value={data.firstName}
                        onChange={(e) => set("firstName", e.target.value)}
                        placeholder="Maya"
                        autoComplete="given-name"
                      />
                    </Field>
                    <Field label="Last name">
                      <Input
                        value={data.lastName}
                        onChange={(e) => set("lastName", e.target.value)}
                        placeholder="Ramirez"
                        autoComplete="family-name"
                      />
                    </Field>
                    <Field label="Email">
                      <Input
                        type="email"
                        value={data.email}
                        onChange={(e) => set("email", e.target.value)}
                        placeholder="maya@ucla.edu"
                        autoComplete="email"
                      />
                      <EmailVerify
                        email={data.email}
                        purpose="student"
                        verified={emailVerified}
                        onVerified={setEmailVerified}
                      />
                    </Field>
                    <Field
                      label="Phone"
                      hint="Optional, but it speeds things up."
                    >
                      <Input
                        type="tel"
                        value={data.phone}
                        onChange={(e) => set("phone", e.target.value)}
                        placeholder="(310) 555-0134"
                        autoComplete="tel"
                      />
                    </Field>
                    <Field label="Level" className="sm:col-span-2">
                      <Pills
                        options={levels}
                        value={data.level}
                        onChange={(v) => set("level", v as string)}
                      />
                    </Field>
                    <Field label="School">
                      <Input
                        value={data.school}
                        onChange={(e) => set("school", e.target.value)}
                        placeholder="UCLA"
                      />
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Grad year">
                        <Select
                          value={data.gradYear}
                          onChange={(e) => set("gradYear", e.target.value)}
                        >
                          <option value="">Year</option>
                          {Array.from({ length: 8 }, (_, i) => 2026 + i).map(
                            (y) => (
                              <option key={y} value={y}>
                                {y}
                              </option>
                            ),
                          )}
                        </Select>
                      </Field>
                      <Field label="City">
                        <Input
                          value={data.location}
                          onChange={(e) => set("location", e.target.value)}
                          placeholder="Los Angeles"
                        />
                      </Field>
                    </div>
                  </div>
                </>
              )}

              {step === 4 && (
                <>
                  <StepHeader
                    index={4}
                    total={steps.length}
                    title="One real thing, then you're done."
                    blurb="This is the part we actually read. A club you ran, a thing you built, a job you held."
                  />
                  <div className="mt-8 space-y-7">
                    <Field
                      label="Something you built, ran or fixed"
                      hint={`${data.built.trim().length} characters — a few sentences is plenty. At least 20 characters.`}
                    >
                      <Textarea
                        rows={5}
                        value={data.built}
                        onChange={(e) => set("built", e.target.value)}
                        placeholder="I ran the robotics team's outreach…"
                      />
                    </Field>
                    <Field label="Résumé">
                      <DropZone file={file} onFile={setFile} />
                    </Field>
                    <Field
                      label="Links"
                      hint="LinkedIn, GitHub, portfolio — whatever you have. Optional."
                    >
                      <Input
                        value={data.links}
                        onChange={(e) => set("links", e.target.value)}
                        placeholder="linkedin.com/in/…"
                      />
                    </Field>

                    <div className="rounded-[22px] bg-shell p-6">
                      <p className="label">Your application</p>
                      <ul className="mt-4 flex flex-wrap gap-2">
                        {[
                          `${data.firstName || "You"}${data.school ? ` · ${data.school}` : ""}`,
                          ...data.interests,
                          data.hours >= 40
                            ? "Full time"
                            : `${data.hours} hrs / wk`,
                          data.setup,
                          `Top priority: ${data.priorities[0]}`,
                        ]
                          .filter(Boolean)
                          .map((chip) => (
                            <li
                              key={chip}
                              className="rounded-full border border-line bg-white px-3.5 py-2 text-[13.5px]"
                            >
                              {chip}
                            </li>
                          ))}
                      </ul>
                    </div>

                    {error && (
                      <p className="rounded-[16px] border border-flame/40 bg-flame/5 px-4 py-3 text-[14px] text-flame">
                        {error}
                      </p>
                    )}
                  </div>
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
              step === steps.length - 1 ? "Submit application" : "Continue"
            }
          />
        </form>
      </div>
    </div>
  );
}

function Success({ name }: { name: string }) {
  return (
    <div className="relative grid min-h-[78vh] place-items-center overflow-hidden px-4 py-32 text-center">
      <Shape
        kind="clover"
        className="pointer-events-none absolute left-[6%] top-[18%] w-28 text-flame"
        float
      />
      <Shape
        kind="scallop"
        className="pointer-events-none absolute right-[8%] top-[24%] w-24 text-sky"
        float
        delay={1}
      />
      <Shape
        kind="burst"
        className="pointer-events-none absolute bottom-[14%] left-[16%] w-24 text-lime"
        float
        delay={1.6}
      />
      <Shape
        kind="squircle"
        className="pointer-events-none absolute bottom-[18%] right-[12%] w-24 text-blush"
        float
        delay={0.5}
      />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
        className="relative max-w-xl"
      >
        <h1 className="display text-[clamp(2.4rem,6vw,4rem)]">
          You&apos;re in the pool{name ? `, ${name}` : ""}.
        </h1>
        <p className="mx-auto mt-6 max-w-md text-[17px] leading-relaxed text-muted">
          We review every application ourselves. If there&apos;s a role that
          fits, you&apos;ll hear from us — and if there isn&apos;t one today,
          you stay in the pool for the next one.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="rounded-full bg-ink px-8 py-4.5 text-[17px] text-white transition-colors hover:bg-flame"
          >
            Back to home
          </Link>
          <Link
            href="/#roles"
            className="rounded-full border border-ink/20 px-8 py-4.5 text-[17px] transition-colors hover:border-ink"
          >
            See the roles we place
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
