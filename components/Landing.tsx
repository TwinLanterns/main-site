"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Reveal } from "./Reveal";
import Shape, { shapePaths } from "./Shapes";

const wrap = "mx-auto w-full max-w-[1240px] px-5";
const btn =
  "rounded-full px-8 py-4.5 text-[17px] transition-colors inline-flex items-center justify-center";

/* ----------------------------------- hero ---------------------------------- */

const phrases = [
  { pre: "Stop hiring ", accent: "sh*tty", post: " interns.", tone: "text-flame" },
  {
    pre: "Stop working for ",
    accent: "sh*tty",
    post: " companies.",
    tone: "text-sky",
  },
];

function Hero() {
  const [phase, setPhase] = useState(0);
  const [n, setN] = useState(phrases[0].pre.length + phrases[0].accent.length + phrases[0].post.length);
  const [erasing, setErasing] = useState(false);

  const p = phrases[phase];
  const full = p.pre + p.accent + p.post;

  // types the line out, holds it, erases it, then moves to the other one
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    if (!erasing) {
      if (n < full.length) {
        const t = setTimeout(() => setN(n + 1), 52);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setErasing(true), 2400);
      return () => clearTimeout(t);
    }

    if (n > 0) {
      const t = setTimeout(() => setN(n - 1), 22);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setErasing(false);
      setPhase((v) => (v + 1) % phrases.length);
    }, 280);
    return () => clearTimeout(t);
  }, [n, erasing, full.length]);

  const spin = (i: number) => (i % 2 === 0 ? phase * 25 : phase * -25);

  return (
    <section className="relative overflow-hidden pb-16 pt-36 sm:pb-24 sm:pt-44">
      {/* shape cluster, left */}
      <div className="pointer-events-none absolute inset-0 hidden lg:block">
        <Shape kind="clover" className="absolute left-[2%] top-[14%] w-[130px] text-flame transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]" rotate={spin(0)} float />
        <Shape kind="arch" className="absolute left-[9%] top-[52%] w-[104px] text-lilac transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]" rotate={spin(1)} float delay={1.2} />
        <Shape kind="hex" className="absolute left-[1%] bottom-[6%] w-[86px] text-lemon transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]" rotate={spin(2)} float delay={0.6} />
        <Shape kind="scallop" className="absolute right-[3%] top-[16%] w-[124px] text-sky transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]" rotate={spin(3)} float delay={0.9} />
        <Shape kind="burst" className="absolute right-[10%] top-[54%] w-[96px] text-lime transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]" rotate={spin(4)} float delay={1.6} />
        <Shape kind="squircle" className="absolute bottom-[7%] right-[2%] w-[88px] text-blush transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]" rotate={spin(5)} float delay={2.1} />
      </div>

      <div className={`${wrap} relative text-center`}>
        <h1 className="display mx-auto min-h-[2em] max-w-[17ch] text-[clamp(2.4rem,6.6vw,5.2rem)]">
          <span>{full.slice(0, Math.min(n, p.pre.length))}</span>
          <span className={p.tone}>
            {n > p.pre.length
              ? full.slice(p.pre.length, Math.min(n, p.pre.length + p.accent.length))
              : ""}
          </span>
          <span>
            {n > p.pre.length + p.accent.length
              ? full.slice(p.pre.length + p.accent.length, n)
              : ""}
          </span>
          <span
            aria-hidden
            className="caret ml-[0.06em] inline-block h-[0.72em] w-[0.045em] translate-y-[0.02em] bg-current align-middle"
          />
        </h1>

        <p className="mx-auto mt-9 max-w-[52ch] text-[17px] leading-relaxed text-muted sm:text-[19px]">
          We screen ambitious high school and college students, scope the role
          with the founder, and put the right two people in the same room. No job
          board. No résumé pile.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href="/apply" className={`${btn} bg-ink text-white hover:bg-flame`}>
            Apply as a student
          </Link>
          <Link
            href="/companies"
            className={`${btn} border border-ink/20 hover:border-ink`}
          >
            Hire a student
          </Link>
        </div>

        {/* mobile shape row */}
        <div className="mt-14 flex items-center justify-center gap-3 lg:hidden">
          {(["clover", "hex", "scallop", "burst", "squircle"] as const).map(
            (k, i) => (
              <Shape
                key={k}
                kind={k}
                className={`w-[17%] transition-transform duration-[900ms] ${["text-flame", "text-lemon", "text-sky", "text-lime", "text-blush"][i]}`}
                rotate={spin(i)}
              />
            ),
          )}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------- stats --------------------------------- */

const stats = [
  ["48 hrs", "to first shortlist"],
  ["$0", "cost to the company"],
  ["100%", "screened by a founder"],
];

function Stats() {
  return (
    <section className="border-y border-line">
      <div className={`${wrap} grid divide-y divide-line sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-3`}>
        {stats.map(([k, v], i) => (
          <Reveal
            key={v}
            delay={i * 0.05}
            className={`py-8 sm:py-10 ${i > 0 ? "lg:border-l lg:border-line lg:pl-8" : ""} ${i === 1 || i === 3 ? "sm:border-l sm:border-line sm:pl-8" : ""}`}
          >
            <p className="display text-[clamp(2rem,3.4vw,2.8rem)]">{k}</p>
            <p className="mt-2 text-[14px] text-muted">{v}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ----------------------------------- split --------------------------------- */

const panels = [
  {
    tone: "bg-flame text-white",
    shape: "clover" as const,
    label: "For students",
    title: "Real work, not a coffee run.",
    points: [
      "One application, kept on file for every role that fits",
      "A real conversation with us before anything is forwarded",
      "Engineering, growth, ops, research, finance and design roles",
      "Company context and prep before the interview, not after",
    ],
    href: "/apply",
    cta: "Start your application",
    linkClass: "bg-white text-ink hover:bg-ink hover:text-white",
  },
  {
    tone: "bg-ink text-white",
    shape: "burst" as const,
    label: "For companies",
    title: "Three people. All of them right.",
    points: [
      "A 30-minute intake call turns a vague need into a real role",
      "Every candidate interviewed by us before you see them",
      "First shortlist in 48 hours, start date inside two weeks",
      "Free — you never pay for a single student we place",
    ],
    href: "/companies",
    cta: "Scope a role with us",
    linkClass: "bg-white text-ink hover:bg-flame hover:text-white",
  },
];

function Split() {
  return (
    <section id="two-sides" className={`${wrap} grid gap-5 py-20 sm:py-28 lg:grid-cols-2`}>
      {panels.map((p, i) => (
        <Reveal key={p.label} delay={i * 0.08}>
          <div className={`relative flex h-full flex-col overflow-hidden rounded-[32px] p-8 sm:p-12 ${p.tone}`}>
            <Shape
              kind={p.shape}
              className="pointer-events-none absolute -right-10 -top-10 w-40 text-white/15"
              rotate={18}
            />
            <p className="label !text-current opacity-60">{p.label}</p>
            <h2 className="display mt-6 max-w-[14ch] text-[clamp(2rem,3.6vw,3rem)]">
              {p.title}
            </h2>
            <ul className="mt-9 space-y-4 border-t border-current/20 pt-8">
              {p.points.map((pt) => (
                <li key={pt} className="flex gap-3.5 text-[15.5px] leading-relaxed opacity-90">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
                  {pt}
                </li>
              ))}
            </ul>
            <Link href={p.href} className={`${btn} mt-10 w-max ${p.linkClass}`}>
              {p.cta}
            </Link>
          </div>
        </Reveal>
      ))}
    </section>
  );
}

/* ---------------------------------- process -------------------------------- */

const steps = [
  {
    n: "01",
    title: "Intake",
    body: "A 30-minute call with us. What the work actually is, who it reports to, what good looks like in month one. We write the job description you never got around to.",
    meta: "Day 0",
    color: "text-flame",
    kind: "clover" as const,
  },
  {
    n: "02",
    title: "Sourcing",
    body: "We pull from our campus partnerships, clubs and student orgs, plus the students already in our pool. Every search starts warm.",
    meta: "Day 1",
    color: "text-sky",
    kind: "hex" as const,
  },
  {
    n: "03",
    title: "Screening",
    body: "Structured interviews against the outcomes we agreed on. We test for judgment and follow-through, not for how polished the résumé looks.",
    meta: "Day 2–4",
    color: "text-lemon",
    kind: "scallop" as const,
  },
  {
    n: "04",
    title: "The shortlist",
    body: "Every candidate you need, each with our notes, the interview read and an honest line on where they would struggle. You take it from here.",
    meta: "Day 5",
    color: "text-lilac",
    kind: "burst" as const,
  },
  {
    n: "05",
    title: "Start date",
    body: "We handle scheduling, the offer conversation and the first-week check-in, then stay close for the first month in case anything drifts.",
    meta: "Week 2",
    color: "text-lime",
    kind: "arch" as const,
  },
];

function Process() {
  return (
    <section id="how" className="border-t border-line py-20 sm:py-28">
      <div className={wrap}>
        <Reveal className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:items-end">
          <h2 className="display max-w-[13ch] text-[clamp(2.2rem,5vw,3.8rem)]">
            From vague need to first day.
          </h2>
          <p className="max-w-md text-[16px] leading-relaxed text-muted lg:pb-2">
            Five steps, run by two people who both stay on the file the whole way
            through.
          </p>
        </Reveal>

        <ol className="mt-14 border-t border-line">
          {steps.map((s, i) => (
            <Reveal as="li" key={s.n} delay={i * 0.04}>
              <div className="group grid items-start gap-4 border-b border-line py-8 transition-colors sm:grid-cols-[64px_minmax(0,1fr)] sm:gap-8 lg:grid-cols-[64px_minmax(0,300px)_minmax(0,1fr)_100px]">
                <div className="flex items-center gap-4">
                  <Shape
                    kind={s.kind}
                    className={`h-8 w-8 shrink-0 transition-transform duration-500 group-hover:rotate-90 ${s.color}`}
                  />
                  <span className="text-[14px] text-muted sm:hidden">{s.meta}</span>
                </div>
                <h3 className="display text-[clamp(1.6rem,2.6vw,2.1rem)]">
                  {s.title}
                </h3>
                <p className="max-w-[56ch] text-[15.5px] leading-relaxed text-muted">
                  {s.body}
                </p>
                <span className="hidden text-right text-[14px] text-muted lg:block">
                  {s.meta}
                </span>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* --------------------------------- statement -------------------------------- */

function Statement() {
  return (
    <section className={`${wrap} py-6 sm:py-10`}>
      <Reveal>
        <div className="relative overflow-hidden rounded-[32px] bg-shell px-7 py-16 sm:px-14 sm:py-24">
          <Shape kind="hex" className="absolute -left-8 -top-6 w-28 text-lemon" rotate={-12} float />
          <Shape kind="clover" className="absolute -bottom-8 -right-6 w-32 text-flame" rotate={12} float delay={1.1} />
          <p className="display mx-auto max-w-[20ch] text-center text-[clamp(2rem,5.4vw,4rem)]">
            A résumé pile tells you who can write a résumé.
          </p>
          <p className="mx-auto mt-7 max-w-[52ch] text-center text-[16px] leading-relaxed text-muted">
            We interview every student, scope every role, and hand founders a
            shortlist small enough to actually decide from.
          </p>
        </div>
      </Reveal>
    </section>
  );
}

/* ----------------------------------- roles ---------------------------------- */

const roleGroups = [
  {
    group: "Engineering",
    color: "text-flame",
    kind: "clover" as const,
    roles: ["Junior software engineer", "Frontend intern", "Data & automation", "QA and release testing", "Technical support"],
  },
  {
    group: "Growth & marketing",
    color: "text-sky",
    kind: "scallop" as const,
    roles: ["Content & social", "Growth analyst", "Email & lifecycle", "Community manager", "Paid ads assistant", "Brand & design"],
  },
  {
    group: "Operations",
    color: "text-lemon",
    kind: "hex" as const,
    roles: ["Ops assistant", "Executive assistant", "Customer success", "Recruiting coordinator", "Inventory & logistics"],
  },
  {
    group: "Finance & research",
    color: "text-lilac",
    kind: "burst" as const,
    roles: ["Financial analyst", "Market research", "Grant research", "Bookkeeping support", "Diligence support"],
  },
];

function Roles() {
  return (
    <section id="roles" className="border-t border-line py-20 sm:py-28">
      <div className={wrap}>
        <Reveal className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:items-end">
          <h2 className="display max-w-[13ch] text-[clamp(2.2rem,5vw,3.8rem)]">
            Roles a student can genuinely own.
          </h2>
          <p className="max-w-md text-[16px] leading-relaxed text-muted lg:pb-2">
            We scope custom roles every week. If a student can own it in ten
            hours a week, we can staff it.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {roleGroups.map((g, i) => (
            <Reveal key={g.group} delay={i * 0.05}>
              <div className="flex items-center gap-3 border-b border-ink pb-3">
                <Shape kind={g.kind} className={`h-5 w-5 ${g.color}`} />
                <h3 className="text-[15px] font-medium">{g.group}</h3>
              </div>
              <ul className="mt-5 space-y-3">
                {g.roles.map((r) => (
                  <li
                    key={r}
                    className="text-[15.5px] text-muted transition-colors hover:text-ink"
                  >
                    {r}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- founders --------------------------------- */

const founders = [
  {
    name: "Carlos Castaneda",
    role: "Co-founder — Talent & Partnerships",
    school: "Political Science & Global Studies, UCLA",
    photo: "/team/carlos.png",
    bio: "Carlos leads the talent side of Twin Lanterns: sourcing, screening and the conversations that decide whether a candidate goes forward. His background in political science and global studies is built on research, interviewing and reading people accurately — the same skills that make a shortlist trustworthy. He owns our campus partnerships and speaks with every student we put in front of a founder.",
    skills: ["Candidate screening & interviews", "Campus and club partnerships", "Shortlist quality control"],
  },
  {
    name: "Cameron Negahban",
    role: "Co-founder — Client & Operations",
    school: "Economics & Biology, UCLA",
    photo: "/team/cameron.png",
    bio: "Cameron runs the company side: scoping roles with founders, translating vague needs into a real job description, and keeping every search on schedule. An economics and biology background gives him an analytical, evidence-first way of working — he tracks what actually predicts a good hire and adjusts the process around it. He's the founder's point of contact from intake through start date.",
    skills: ["Role scoping with founders", "Search operations & timelines"],
  },
];

/** Photo poured into an organic shape that turns and breathes like a bubble. */
function BlobPhoto({
  src,
  alt,
  kind,
  id,
}: {
  src: string;
  alt: string;
  kind: "clover" | "scallop";
  id: string;
}) {
  return (
    <svg viewBox="0 0 200 200" role="img" aria-label={alt} className="w-full">
      <defs>
        <clipPath id={id}>
          <path d={shapePaths[kind]} className="blob-morph" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <image
          href={src}
          x="-30"
          y="-26"
          width="262"
          height="272"
          preserveAspectRatio="xMidYMin slice"
        />
      </g>
    </svg>
  );
}
function Founders() {
  return (
    <section id="team" className="overflow-hidden border-t border-line py-20 sm:py-28">
      <div className={wrap}>
        <Reveal>
          <h2 className="display max-w-[14ch] text-[clamp(2.2rem,5vw,3.8rem)]">
            You get both founders on every search.
          </h2>
        </Reveal>

        <div className="mt-16 space-y-20 sm:mt-20 sm:space-y-8">
          {founders.map((f, i) => {
            const flipped = i % 2 === 1;
            const lines = [
              <h3 key="n" className="display text-[clamp(1.9rem,3.4vw,2.6rem)]">
                {f.name}
              </h3>,
              <p key="r" className="mt-3 text-[15.5px]">
                {f.role}
              </p>,
              <p key="s" className="mt-1 text-[14.5px] text-muted">
                {f.school}
              </p>,
              <p key="b" className="mt-6 max-w-[52ch] text-[15.5px] leading-relaxed text-muted">
                {f.bio}
              </p>,
              <ul key="k" className="mt-7 flex flex-wrap gap-2">
                {f.skills.map((s) => (
                  <li
                    key={s}
                    className="rounded-full border border-line px-4 py-2 text-[13.5px]"
                  >
                    {s}
                  </li>
                ))}
              </ul>,
            ];

            return (
              <div
                key={f.name}
                className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${
                  flipped ? "lg:translate-y-16" : "lg:-translate-y-4"
                }`}
              >
                <Reveal
                  className={`mx-auto w-full max-w-[400px] ${flipped ? "lg:order-2 lg:ml-auto lg:mr-0" : "lg:mr-auto lg:ml-0"}`}
                >
                  <BlobPhoto
                    src={f.photo}
                    alt={`${f.name}, ${f.role} at Twin Lanterns`}
                    kind={flipped ? "scallop" : "clover"}
                    id={`founder-blob-${i}`}
                  />
                </Reveal>

                <div className={flipped ? "lg:order-1" : ""}>
                  {lines.map((line, li) => (
                    <Reveal key={li} delay={li * 0.09}>
                      {line}
                    </Reveal>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------ faq ----------------------------------- */

const faqs = [
  ["Does it cost students anything?", "Nothing upfront, ever. Applying, being screened and interviewing are all free — you're only charged once you've been accepted into a role, never before that."],
  ["I'm in high school. Am I too young?", "No. A meaningful share of our placements are high schoolers in part-time, remote roles. What matters is that you can be relied on for a set number of hours a week."],
  ["How long does a search take?", "First shortlist within 48 hours of the intake call. Most roles have someone starting inside two weeks."],
  ["What does it cost a company?", "Nothing. You don't pay for a single student we place — no placement fee, no hourly cost, no invoice at the end of the month."],
  ["What if the placement doesn't work out?", "We stay on the file for the first month. If it isn't working, we re-run the search at no additional cost."],
  ["Remote or in person?", "Both. Most student roles are remote or hybrid; we filter for location on the intake call so nobody's time gets wasted."],
];

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="border-t border-line py-20 sm:py-28">
      <div className={`${wrap} grid gap-12 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)]`}>
        <Reveal>
          <h2 className="display max-w-[10ch] text-[clamp(2.2rem,5vw,3.8rem)]">
            The things everyone asks.
          </h2>
        </Reveal>
        <div className="border-t border-line">
          {faqs.map(([q, a], i) => {
            const isOpen = open === i;
            return (
              <div key={q} className="border-b border-line">
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-6 py-6 text-left"
                >
                  <span className="text-[17px]">{q}</span>
                  <span className="relative grid h-6 w-6 shrink-0 place-items-center">
                    <span className="absolute h-px w-3.5 bg-ink" />
                    <span
                      className={`absolute h-3.5 w-px bg-ink transition-transform duration-300 ${isOpen ? "scale-y-0" : ""}`}
                    />
                  </span>
                </button>
                <div
                  className={`grid transition-[grid-template-rows] duration-300 ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                >
                  <div className="overflow-hidden">
                    <p className="max-w-[60ch] pb-7 text-[15.5px] leading-relaxed text-muted">
                      {a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------ cta ----------------------------------- */

function Cta() {
  return (
    <section className="relative overflow-hidden border-t border-line py-24 sm:py-32">
      <Shape kind="squircle" className="pointer-events-none absolute -left-10 top-16 w-32 text-blush" float />
      <Shape kind="burst" className="pointer-events-none absolute -right-8 bottom-10 w-32 text-lime" float delay={1.4} rotate={12} />
      <div className={`${wrap} relative text-center`}>
        <Reveal>
          <h2 className="display mx-auto max-w-[16ch] text-[clamp(2.4rem,6.4vw,5rem)]">
            Two lanterns. One bridge.
          </h2>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link href="/apply" className={`${btn} bg-ink text-white hover:bg-flame`}>
              Apply as a student
            </Link>
            <Link
              href="/companies"
              className={`${btn} border border-ink/20 hover:border-ink`}
            >
              Hire a student
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ----------------------------------- banner --------------------------------- */

function Banner() {
  const [displayText, setDisplayText] = useState("");
  const [done, setDone] = useState(false);
  const [line1Complete, setLine1Complete] = useState(false);
  const fullLine1 = "Get the people you need...";
  const fullLine2 = "when you need them.";
  const fullText = fullLine1 + " " + fullLine2;

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setDisplayText(fullText);
      setLine1Complete(true);
      setDone(true);
      return;
    }

    if (done) return;

    if (line1Complete && displayText === fullLine1) {
      const t = setTimeout(() => {
        setDisplayText(fullLine1 + " ");
      }, 600);
      return () => clearTimeout(t);
    }

    if (displayText === fullLine1 + " ") {
      const t = setTimeout(() => {
        setDisplayText(fullLine1 + " " + fullLine2.slice(0, 1));
      }, 600);
      return () => clearTimeout(t);
    }

    if (displayText.length < fullText.length) {
      const t = setTimeout(() => {
        setDisplayText(fullText.slice(0, displayText.length + 1));
      }, 45);
      return () => clearTimeout(t);
    }

    if (displayText === fullLine1 && !line1Complete) {
      setLine1Complete(true);
      return;
    }
    if (displayText === fullText) {
      const t = setTimeout(() => setDone(true), 800);
      return () => clearTimeout(t);
    }
  }, [displayText, done, fullText, fullLine1, fullLine2, line1Complete]);

  const line1Text = displayText.length <= fullLine1.length 
    ? displayText 
    : fullLine1;
  const line2Text = displayText.length > fullLine1.length 
    ? displayText.slice(fullLine1.length + 1) 
    : "";

  const showCaretOnLine1 = !done && displayText.length > 0 && displayText.length <= fullLine1.length + 1;
  const showCaretOnLine2 = displayText.length > fullLine1.length + 1;

  return (
    <Reveal>
      <div className={`${wrap} pt-6 sm:pt-8`}>
        <div className="rounded-[32px] bg-ink px-6 py-10 text-center sm:px-12 sm:py-12">
          <p className="text-[clamp(1.8rem,4.4vw,3.2rem)] text-white">
            {line1Text || <span className="invisible">.</span>}
            {showCaretOnLine1 && (
              <span
                aria-hidden
                className="caret ml-[0.06em] inline-block h-[0.8em] w-[0.045em] translate-y-[-0.1em] align-middle bg-white"
              />
            )}
          </p>
          <p className="font-extrabold text-[clamp(1.8rem,4.4vw,3.2rem)] text-white">
            {line2Text}
            {showCaretOnLine2 && (
              <span
                aria-hidden
                className="caret ml-[0.06em] inline-block h-[0.8em] w-[0.045em] translate-y-[-0.1em] align-middle bg-white"
              />
            )}
          </p>
        </div>
      </div>
    </Reveal>
  );
}
export default function Landing() {
  return (
    <>
      <Hero />
      <Stats />
      <Banner />
      <Split />
      <Process />
      <Statement />
      <Roles />
      <Faq />
      <Cta />
    </>
  );
}
