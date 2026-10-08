"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Reveal } from "./Reveal";
import Shape from "./Shapes";
import { PROGRAMS } from "@/lib/programs";

const wrap = "mx-auto w-full max-w-[1240px] px-5";
const btn =
  "rounded-full px-8 py-4.5 text-[17px] transition-colors inline-flex items-center justify-center";

/* ----------------------------------- hero ---------------------------------- */

const phrases = [
  {
    pre: "Stop hiring ",
    accent: "sh*tty",
    post: " interns.",
    tone: "text-flame",
  },
  {
    pre: "Stop working for ",
    accent: "sh*tty",
    post: " companies.",
    tone: "text-sky",
  },
];

function Hero() {
  const [phase, setPhase] = useState(0);
  const [n, setN] = useState(
    phrases[0].pre.length + phrases[0].accent.length + phrases[0].post.length,
  );
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
    <section className="relative overflow-hidden pb-10 pt-36 sm:pb-14 sm:pt-44">
      {/* shape cluster, left */}
      <div className="pointer-events-none absolute inset-0 hidden lg:block">
        <Shape
          kind="clover"
          className="absolute left-[2%] top-[14%] w-[130px] text-flame transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          rotate={spin(0)}
          float
        />
        <Shape
          kind="arch"
          className="absolute left-[9%] top-[52%] w-[104px] text-lilac transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          rotate={spin(1)}
          float
          delay={1.2}
        />
        <Shape
          kind="hex"
          className="absolute left-[1%] bottom-[6%] w-[86px] text-lemon transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          rotate={spin(2)}
          float
          delay={0.6}
        />
        <Shape
          kind="scallop"
          className="absolute right-[3%] top-[16%] w-[124px] text-sky transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          rotate={spin(3)}
          float
          delay={0.9}
        />
        <Shape
          kind="burst"
          className="absolute right-[10%] top-[54%] w-[96px] text-lime transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          rotate={spin(4)}
          float
          delay={1.6}
        />
        <Shape
          kind="squircle"
          className="absolute bottom-[7%] right-[2%] w-[88px] text-blush transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          rotate={spin(5)}
          float
          delay={2.1}
        />
      </div>

      <div className={`${wrap} relative text-center`}>
        <a
          href="#programs"
          className="label mb-8 inline-flex items-center gap-3 rounded-full border border-ink/15 px-4 py-2 transition-colors hover:border-ink"
        >
          <span className="flex -space-x-1">
            {PROGRAMS.map((p) => (
              <span key={p.slug} className={`h-2.5 w-2.5 rounded-full ring-2 ring-white ${p.dot}`} />
            ))}
          </span>
          Three programs open now · paid roles at $10/hr
          <span aria-hidden>↓</span>
        </a>
        <h1 className="display mx-auto min-h-[2em] max-w-[17ch] text-[clamp(2.4rem,6.6vw,5.2rem)]">
          <span>{full.slice(0, Math.min(n, p.pre.length))}</span>
          <span className={p.tone}>
            {n > p.pre.length
              ? full.slice(
                  p.pre.length,
                  Math.min(n, p.pre.length + p.accent.length),
                )
              : ""}
          </span>
          <span>
            {n > p.pre.length + p.accent.length
              ? full.slice(p.pre.length + p.accent.length, n)
              : ""}
          </span>
          <span
            aria-hidden
            className="caret ml-[0.06em] inline-block h-[0.72em] w-[0.045em] translate-y-[-0.02em] bg-current align-middle"
          />
        </h1>

        <p className="mx-auto mt-9 max-w-[52ch] text-[17px] leading-relaxed text-muted sm:text-[19px]">
          We screen ambitious high school and college students, scope the role
          with the founder, and put the right two people in the same room. No
          job board. No résumé pile.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <a
            href="#programs"
            className={`${btn} bg-ink text-white hover:bg-flame`}
          >
            See open programs
          </a>
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

/* --------------------------------- programs -------------------------------- */

const programs = PROGRAMS;

// Time each program holds the spotlight, and how strongly the motion slows
// while a card is centred (0 = constant speed; <1 means it never fully stops).
const CYCLE_MS = 4200;
const SLOW = 0.85;
const MANUAL_MS = 700;

// Eased position within one step. Slope is (1 - SLOW) while a card sits
// centred and spikes to ~2.4x average speed mid-transition, so it always
// moves but whips between cards. (Integral of the slope over a step is 1.)
const glide = (u: number) => {
  const th = 2 * Math.PI * u;
  const burst = u - (Math.sin(th) / Math.PI - Math.sin(2 * th) / (8 * Math.PI)) / 1.5;
  return (1 - SLOW) * u + SLOW * burst;
};
const smooth = (t: number) => t * t * (3 - 2 * t);

function Programs() {
  const n = programs.length;
  const pausedRef = useRef(false);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const veilRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const dotRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const clock = useRef({
    base: 0,
    u: 0,
    pos: 0,
    tween: null as null | { from: number; to: number; t: number },
  });
  const activeRef = useRef(-1);
  const dotRef = useRef(-1);
  const reduced = useRef(false);

  const paint = () => {
    const { pos } = clock.current;
    slideRefs.current.forEach((el, i) => {
      if (!el) return;
      let d = (((i - pos) % n) + n) % n;
      if (d > n / 2) d -= n;
      const a = Math.min(Math.abs(d), 1);
      el.style.transform = `translate3d(calc(${d} * (100% + 14px)), 0, 0) scale(${1 - 0.08 * a})`;
      el.style.opacity = String(1 - 0.28 * a);
      el.style.zIndex = Math.abs(d) < 0.5 ? "10" : "0";
    });

    // the dot for the card nearest the centre widens as soon as focus changes
    const near = ((Math.round(pos) % n) + n) % n;
    if (near !== dotRef.current) {
      dotRef.current = near;
      dotRefs.current.forEach((el, i) => {
        if (el) el.dataset.on = String(i === near);
      });
    }

    // whichever card is centred is the interactive one; only swap once it has
    // settled, so the DOM/accessibility update never lands mid-slide
    const focus = ((Math.round(pos) % n) + n) % n;
    if (focus !== activeRef.current && Math.abs(pos - Math.round(pos)) < 0.04) {
      activeRef.current = focus;
      cardRefs.current.forEach((el, i) => {
        if (!el) return;
        el.inert = i !== focus;
        el.setAttribute("aria-hidden", String(i !== focus));
        const veil = veilRefs.current[i];
        if (veil) veil.style.display = i === focus ? "none" : "block";
        dotRefs.current[i]?.setAttribute("aria-current", String(i === focus));
      });
    }
  };

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(now - last, 64);
      last = now;
      const c = clock.current;
      if (c.tween) {
        c.tween.t = Math.min(1, c.tween.t + dt / MANUAL_MS);
        c.pos = c.tween.from + (c.tween.to - c.tween.from) * smooth(c.tween.t);
        if (c.tween.t >= 1) {
          c.base = c.tween.to;
          c.u = 0;
          c.pos = c.base;
          c.tween = null;
        }
      } else if (!reduced.current) {
        // hovering holds the carousel, but only once a card is centred — a
        // slide already under way finishes first instead of freezing mid-air
        const hold = pausedRef.current && c.u < 0.12;
        if (!hold) {
          c.u += dt / CYCLE_MS;
          while (c.u >= 1) {
            c.u -= 1;
            c.base += 1;
            if (pausedRef.current) c.u = 0;
          }
          c.pos = c.base + glide(c.u);
        }
      }
      paint();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goTo = (target: number) => {
    const c = clock.current;
    c.tween = { from: c.pos, to: target, t: 0 };
  };
  const step = (dir: number) => goTo(Math.round(clock.current.pos) + dir);
  const jump = (i: number) => {
    // shortest way round to program i
    const cur = Math.round(clock.current.pos);
    let d = (((i - cur) % n) + n) % n;
    if (d > n / 2) d -= n;
    goTo(cur + d);
  };

  return (
    <section
      id="programs"
      className={`${wrap} scroll-mt-24 pb-10 sm:pb-16`}
      onMouseEnter={() => (pausedRef.current = true)}
      onMouseLeave={() => (pausedRef.current = false)}
      onFocus={() => (pausedRef.current = true)}
      onBlur={() => (pausedRef.current = false)}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <p className="label">Programs · open now</p>
        <div className="flex items-center gap-2">
          {programs.map((p, i) => (
            <button
              key={p.slug}
              type="button"
              aria-label={`Show ${p.name}`}
              ref={(el) => {
                dotRefs.current[i] = el;
              }}
              onClick={() => jump(i)}
              data-on={i === 0}
              className="group relative h-2 w-2 overflow-hidden rounded-full bg-ink/15 transition-all duration-500 ease-out hover:bg-ink/30 data-[on=true]:w-10"
            >
              <span
                className={`absolute inset-0 opacity-0 transition-opacity duration-500 group-data-[on=true]:opacity-100 ${p.dot}`}
              />
            </button>
          ))}
          <button
            type="button"
            aria-label="Previous program"
            onClick={() => step(-1)}
            className="ml-3 flex h-10 w-10 items-center justify-center rounded-full border border-ink/15 transition-colors hover:bg-ink hover:text-white"
          >
            ←
          </button>
          <button
            type="button"
            aria-label="Next program"
            onClick={() => step(1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/15 transition-colors hover:bg-ink hover:text-white"
          >
            →
          </button>
        </div>
      </div>

      {/* slides share one grid cell (keeps the tallest height); neighbours peek in from the sides */}
      <div className="-mx-1 grid overflow-hidden px-1 pb-12 -mb-6">
        {programs.map((p, i) => {
          return (
            <div
              key={p.slug}
              ref={(el) => {
                slideRefs.current[i] = el;
              }}
              className="relative col-start-1 row-start-1 mx-[7%] will-change-transform"
            >
              <div
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                className="relative grid h-full gap-10 overflow-hidden rounded-[36px] bg-ink p-8 text-white shadow-[0_30px_60px_-20px_rgba(13,13,13,0.55)] ring-1 ring-white/10 sm:p-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-center"
              >
                <div className={`absolute inset-x-0 top-0 h-1.5 ${p.dot}`} />
                <Shape
                  kind={p.shape}
                  className={`pointer-events-none absolute -right-14 -top-14 w-64 opacity-50 ${p.shapeTone}`}
                  rotate={16 + i * 10}
                  float
                  delay={i * 0.7}
                />
                <div className="relative">
                  <span className="label inline-flex items-center gap-2.5 rounded-full border border-white/20 px-4 py-2 !text-white/80">
                    <span className={`h-1.5 w-1.5 rounded-full ${p.dot}`} />
                    {p.tag}
                  </span>
                  <h2 className="display mt-7 max-w-[18ch] text-[clamp(2.2rem,4.8vw,3.8rem)]">
                    {p.title}
                  </h2>
                  <p className="mt-6 max-w-[50ch] text-[17px] leading-relaxed text-white/70">
                    {p.body}
                  </p>
                  <div className="mt-9 flex flex-wrap gap-3">
                    <Link href={p.apply} className={`${btn} ${p.primary}`}>
                      Start earning
                    </Link>
                    <Link
                      href={p.more}
                      className={`${btn} border border-white/25 hover:border-white`}
                    >
                      See more
                    </Link>
                    {p.ambassador && (
                      <Link
                        href="/earn/refer"
                        className={`${btn} text-white/70 underline-offset-4 hover:text-white hover:underline`}
                      >
                        Become an ambassador
                      </Link>
                    )}
                  </div>
                </div>

                <dl className="relative rounded-[28px] border border-white/10 bg-white/[0.04] p-7 sm:p-9">
                  {p.facts.map(([k, v]) => (
                    <div
                      key={k}
                      className="border-b border-white/10 py-5 first:pt-0 last:border-0 last:pb-0"
                    >
                      <dt className="display text-[clamp(1.5rem,2.6vw,2.1rem)]">{k}</dt>
                      <dd className="mt-1.5 text-[14.5px] text-white/60">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <button
                type="button"
                aria-label={`Show ${p.name}`}
                onClick={() => jump(i)}
                ref={(el) => {
                  veilRefs.current[i] = el;
                }}
                className="absolute inset-0 cursor-pointer rounded-[36px]"
              />
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex justify-center">
        <Link
          href="/programs"
          className={`${btn} border border-ink/20 hover:bg-ink hover:text-white`}
        >
          See all programs →
        </Link>
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
      <div
        className={`${wrap} grid divide-y divide-line sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-3`}
      >
        {stats.map(([k, v], i) => (
          <Reveal
            key={v}
            delay={i * 0.05}
            className={`py-8 sm:py-10 text-center ${i > 0 ? "lg:border-l lg:border-line lg:pl-8" : ""} ${i === 1 || i === 3 ? "sm:border-l sm:border-line sm:pl-8" : ""}`}
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
    title: "Every single person you need, vetted and checked.",
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
    <section
      id="two-sides"
      className={`${wrap} grid gap-5 py-20 sm:py-28 lg:grid-cols-2`}
    >
      {panels.map((p, i) => (
        <Reveal key={p.label} delay={i * 0.08}>
          <div
            className={`relative flex h-full flex-col overflow-hidden rounded-[32px] p-8 sm:p-12 ${p.tone}`}
          >
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
                <li
                  key={pt}
                  className="flex gap-3.5 text-[15.5px] leading-relaxed opacity-90"
                >
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
            Five steps, run by two people who both stay on the file the whole
            way through.
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
                  <span className="text-[14px] text-muted sm:hidden">
                    {s.meta}
                  </span>
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
          <Shape
            kind="hex"
            className="absolute -left-8 -top-6 w-28 text-lemon"
            rotate={-12}
            float
          />
          <Shape
            kind="clover"
            className="absolute -bottom-8 -right-6 w-32 text-flame"
            rotate={12}
            float
            delay={1.1}
          />
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
    roles: [
      "Junior software engineer",
      "Frontend intern",
      "Data & automation",
      "QA and release testing",
      "Technical support",
    ],
  },
  {
    group: "Growth & marketing",
    color: "text-sky",
    kind: "scallop" as const,
    roles: [
      "Content & social",
      "Growth analyst",
      "Email & lifecycle",
      "Community manager",
      "Paid ads assistant",
      "Brand & design",
    ],
  },
  {
    group: "Operations",
    color: "text-lemon",
    kind: "hex" as const,
    roles: [
      "Ops assistant",
      "Executive assistant",
      "Customer success",
      "Recruiting coordinator",
      "Inventory & logistics",
    ],
  },
  {
    group: "Finance & research",
    color: "text-lilac",
    kind: "burst" as const,
    roles: [
      "Financial analyst",
      "Market research",
      "Grant research",
      "Bookkeeping support",
      "Diligence support",
    ],
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

/* ------------------------------------ faq ----------------------------------- */

const faqs = [
  [
    "Does it cost students anything?",
    "Nothing upfront, ever. Applying, being screened and interviewing are all free — you're only charged once you've been accepted into a role, never before that.",
  ],
  [
    "I'm in high school. Am I too young?",
    "No. A meaningful share of our placements are high schoolers in part-time, remote roles. What matters is that you can be relied on for a set number of hours a week.",
  ],
  [
    "How long does a search take?",
    "First shortlist within 48 hours of the intake call. Most roles have someone starting inside two weeks.",
  ],
  [
    "What does it cost a company?",
    "Nothing. You don't pay for a single student we place — no placement fee, no hourly cost, no invoice at the end of the month.",
  ],
  [
    "What if the placement doesn't work out?",
    "We stay on the file for the first month. If it isn't working, we re-run the search at no additional cost.",
  ],
  [
    "Remote or in person?",
    "Both. Most student roles are remote or hybrid; we filter for location on the intake call so nobody's time gets wasted.",
  ],
];

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="border-t border-line py-20 sm:py-28">
      <div
        className={`${wrap} grid gap-12 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)]`}
      >
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
      <Shape
        kind="squircle"
        className="pointer-events-none absolute -left-10 top-16 w-32 text-blush"
        float
      />
      <Shape
        kind="burst"
        className="pointer-events-none absolute -right-8 bottom-10 w-32 text-lime"
        float
        delay={1.4}
        rotate={12}
      />
      <div className={`${wrap} relative text-center`}>
        <Reveal>
          <h2 className="display mx-auto max-w-[16ch] text-[clamp(2.4rem,6.4vw,5rem)]">
            Two lanterns. One bridge.
          </h2>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              href="/#programs"
              className={`${btn} bg-ink text-white hover:bg-flame`}
            >
              See open programs
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

export default function Landing() {
  return (
    <>
      <Hero />
      <Programs />
      <Stats />
      <Process />
      <Split />
      <Statement />
      <Roles />
      <Faq />
      <Cta />
    </>
  );
}