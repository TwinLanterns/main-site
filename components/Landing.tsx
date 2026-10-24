"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Mark from "./Mark";
import { CONTACT_EMAIL, DATA_REQUEST_HREF } from "@/lib/site";
import "./landing.css";

/* --------------------------------- content --------------------------------- */

const sentence: [string, boolean][] = [
  ["Robots learn by watching people. We find those people, put cameras on them, and run every hour of capture", false],
  ["from first recruit to final delivery.", true],
];
const words = sentence.flatMap(([text, hot]) => text.split(/\s+/).map((w) => ({ w, hot })));

const products = [
  {
    label: "Egocentric video",
    title: "Skilled work, first person.",
    body: "Mechanics, cooks, warehouse crews and tradespeople filming their real shifts on head-mounted cameras.",
    specs: [
      ["Rig", "Phone on head strap, 70° down"],
      ["Settings", "Commercial and industrial"],
      ["Clips", "2 min and up, both hands in frame"],
    ],
    apply: "/earn/apply",
    more: "/earn/info",
    art: "hands",
  },
  {
    label: "In-home video",
    title: "The everyday, room by room.",
    body: "Vetted households recording the chores robots will one day do, across kitchens, bedrooms, living rooms and laundry.",
    specs: [
      ["Rig", "Supplied camera, head-mounted"],
      ["Rooms", "Kitchen, bed, living, laundry, dining"],
      ["Review", "Within 24 hours of capture"],
    ],
    apply: "/earn/gopro/apply",
    more: "/earn/gopro",
    art: "rooms",
  },
  {
    label: "Speech",
    title: "Conversation, as it's spoken.",
    body: "Two-person sessions, scripted and unscripted, indoors and out, recruited to the voices your model hasn't heard.",
    specs: [
      ["Format", "Two speakers, one continuous take"],
      ["Cohorts", "Built to your demographic quotas"],
      ["Consent", "Voice-specific release"],
    ],
    apply: "/earn/speech/apply",
    more: "/earn/speech",
    art: "wave",
  },
] as const;

const steps = [
  ["Sourcing", "Real workers, households and speakers, recruited and screened by us."],
  ["Logistics", "Cameras shipped, tracked and recovered. Footage in every day."],
  ["Operations", "Scheduling, training, coaching and backfill, run on the ground."],
  ["Delivery", "Reviewed hours, metadata and releases, ready to train on."],
];

const standards = [
  {
    title: "Review",
    sub: "Every clip checked within a day.",
    body: "Footage is checked for framing, motion, lighting and task quality. Anything that fails is coached and re-recorded before it reaches you.",
  },
  {
    title: "Consent",
    sub: "A signed release for every person.",
    body: "Contributors know what they're recording and that it trains AI. Speech work uses voice-specific releases, and minors take part only with a guardian's consent.",
  },
  {
    title: "Metadata",
    sub: "Context ships with every file.",
    body: "Age range, region, accent, setting and task travel with each recording, so you can filter, balance and audit your training set.",
  },
];

/* ----------------------------------- art ----------------------------------- */

function Art({ kind }: { kind: (typeof products)[number]["art"] }) {
  if (kind === "hands") {
    return (
      <svg className="art" viewBox="0 0 500 400" aria-hidden="true">
        <path className="s" d="M20 300 L480 270" />
        <circle className="s" cx="250" cy="230" r="70" />
        <circle className="s" cx="250" cy="230" r="26" />
        <path className="s" d="M130 400 C140 330 165 300 200 292 C222 288 230 300 224 314 L212 345 L220 400" />
        <path className="s" d="M380 400 C370 334 345 304 312 296 C292 292 284 304 292 318 L304 348 L298 400" />
        <rect className="h" x="120" y="282" width="120" height="112" />
        <rect className="h" x="276" y="286" width="120" height="112" />
        <text className="t" x="120" y="274">L-HAND 0.97</text>
        <text className="t" x="276" y="278">R-HAND 0.95</text>
        <path className="s" d="M20 50V20h30M450 20h30v30" />
        <circle className="a" cx="30" cy="54" r="4" />
        <text className="t" x="42" y="58">REC</text>
      </svg>
    );
  }
  if (kind === "rooms") {
    return (
      <svg className="art" viewBox="0 0 500 400" aria-hidden="true">
        <path className="s" d="M40 340 L40 120 L250 40 L460 120 L460 340 Z" />
        <path className="s" d="M250 40 L250 340 M40 230 L460 230" />
        <rect className="s" x="80" y="260" width="120" height="50" />
        <rect className="s" x="300" y="150" width="110" height="60" />
        <rect className="h" x="290" y="250" width="130" height="80" />
        <text className="t" x="60" y="140">KITCHEN</text>
        <text className="t" x="270" y="140">BEDROOM</text>
        <text className="t" x="60" y="250">LIVING</text>
        <text className="t" x="290" y="244">LAUNDRY · ACTIVE</text>
        <circle className="a" cx="410" cy="262" r="4" />
      </svg>
    );
  }
  // two interleaved waveforms
  return (
    <svg className="art" viewBox="0 0 500 400" aria-hidden="true">
      {Array.from({ length: 60 }, (_, i) => {
        const x = 40 + i * 7;
        // rounded so server (Node) and client trig results serialize identically
        const a = Math.round((Math.abs(Math.sin(i * 0.55) * Math.cos(i * 0.13)) * 90 + 6) * 100) / 100;
        const top = i % 14 < 7;
        return (
          <line
            key={i}
            x1={x}
            x2={x}
            y1={top ? 160 - a : 240}
            y2={top ? 160 : 240 + a}
            stroke={top ? "var(--amber)" : "var(--dim)"}
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        );
      })}
      <line x1="30" x2="470" y1="200" y2="200" stroke="#2c3138" />
      <text className="t" x="40" y="54">SPEAKER A</text>
      <text className="t" x="40" y="370">SPEAKER B</text>
    </svg>
  );
}

/* ---------------------------------- page ----------------------------------- */

export default function Landing() {
  const [live, setLive] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const markRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const bloomRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);
  const wordsRef = useRef<HTMLElement>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const railRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dotRefs = useRef<(HTMLElement | null)[]>([]);
  const chainRef = useRef<HTMLElement>(null);
  const beamRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);

  // scroll effects are an enhancement: without them (or with reduced motion)
  // every scene renders as a plain, readable section
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLive(true);
  }, []);

  useEffect(() => {
    if (!live) return;
    const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
    const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
    const prog = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      const t = r.height - innerHeight;
      return t > 0 ? clamp(-r.top / t) : 0;
    };

    let ticking = false;
    const frame = () => {
      ticking = false;
      const hero = heroRef.current, hm = markRef.current, ht = textRef.current;
      const bl = bloomRef.current, cue = cueRef.current;
      const wsec = wordsRef.current, rail = railRef.current, track = trackRef.current;
      const chain = chainRef.current, beam = beamRef.current;
      if (!hero || !hm || !ht || !bl || !cue || !wsec || !rail || !track || !chain || !beam) return;

      // hero: text lifts away, then the mark scales until you pass through its spark
      let p = prog(hero);
      ht.style.opacity = String(1 - seg(p, 0, 0.28));
      ht.style.transform = `translateY(${-seg(p, 0, 0.4) * 60}px)`;
      cue.style.opacity = String(1 - seg(p, 0, 0.1));
      const z = seg(p, 0.12, 1);
      const pin = hero.firstElementChild as HTMLElement;
      const hin = hm.parentElement as HTMLElement;
      const dy = pin.clientHeight / 2 - (hin.offsetTop + hm.offsetTop + hm.offsetHeight * 0.444);
      hm.style.transform = `translateY(${seg(p, 0.02, 0.45) * dy}px)`;
      hm.style.setProperty("--z", String(1 + z * z * z * 22));
      hm.style.opacity = String(1 - seg(p, 0.72, 0.98));
      bl.style.opacity = String(0.6 + seg(p, 0.1, 0.7) * 1.6);

      // words light up in order
      p = prog(wsec);
      const n = Math.round(seg(p, 0.08, 0.82) * words.length);
      wordRefs.current.forEach((w, i) => w?.classList.toggle("on", i < n));

      // rail moves sideways while you scroll down
      p = prog(rail);
      const q = seg(p, 0.06, 0.94);
      track.style.transform = `translate3d(${(-q * 200) / 3}%,0,0)`;
      const idx = Math.min(2, Math.round(q * 2));
      dotRefs.current.forEach((d, i) => d?.classList.toggle("on", i === idx));

      // chain draws left to right and lights each step
      p = prog(chain);
      const c = seg(p, 0.1, 0.8);
      beam.style.transform = `scaleX(${c})`;
      nodeRefs.current.forEach((nd, i) => nd?.classList.toggle("on", c > 0.02 && c >= i / 3 - 0.02));
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(frame);
      }
    };
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", frame);
    frame();
    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", frame);
    };
  }, [live]);

  return (
    <div className={`home${live ? " js" : ""}`}>
      {/* Scene 1: logo, one line; scrolling flies you through the lantern */}
      <section ref={heroRef} className="scene s-hero" id="top">
        <div className="pin">
          <div ref={bloomRef} className="bloom" />
          <div className="hero-in">
            <div ref={markRef} className="hmark" role="img" aria-label="Twin Lanterns logo">
              <Mark className="block" />
            </div>
            <div ref={textRef} className="htext">
              <div className="word">TWIN LANTERNS</div>
              <h1>We capture the real world for AI.</h1>
            </div>
          </div>
          <div ref={cueRef} className="cue">
            <span>Scroll</span>
            <i />
          </div>
        </div>
      </section>

      {/* Scene 2: one sentence that lights up word by word */}
      <section ref={wordsRef} className="scene s-words">
        <div className="pin">
          <p className="words">
            {words.map(({ w, hot }, i) => (
              <span key={i}>
                <span
                  ref={(el) => {
                    wordRefs.current[i] = el;
                  }}
                  className={`w${hot ? " hot" : ""}`}
                >
                  {w}
                </span>{" "}
              </span>
            ))}
          </p>
        </div>
      </section>

      {/* Scene 3: horizontal rail of the three data products */}
      <section ref={railRef} className="scene s-rail" id="data">
        <div className="pin">
          <div className="rail-head wrap">
            <span className="label">Data</span>
            <div className="dots" aria-hidden="true">
              {products.map((p, i) => (
                <i
                  key={p.label}
                  ref={(el) => {
                    dotRefs.current[i] = el;
                  }}
                  className={i === 0 ? "on" : undefined}
                />
              ))}
            </div>
          </div>
          <div ref={trackRef} className="track">
            {products.map((p) => (
              <div key={p.label} className="panel">
                <div className="wrap">
                  <div>
                    <span className="label">{p.label}</span>
                    <h2>{p.title}</h2>
                    <p className="d">{p.body}</p>
                    <details>
                      <summary>
                        Specifications
                        <span className="plus" aria-hidden="true" />
                      </summary>
                      <dl>
                        {p.specs.map(([k, v]) => (
                          <div key={k} className="contents">
                            <dt>{k}</dt>
                            <dd>{v}</dd>
                          </div>
                        ))}
                      </dl>
                    </details>
                    <div className="pacts">
                      <Link className="arrow lit" href={p.apply}>
                        Apply to film
                      </Link>
                      <Link className="arrow" href={p.more}>
                        Program details
                      </Link>
                    </div>
                  </div>
                  <Art kind={p.art} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Scene 4: one team, end to end */}
      <section ref={chainRef} className="scene s-chain" id="method">
        <div className="pin">
          <div className="chain-in wrap">
            <h2>
              One team. <span>Every step.</span>
            </h2>
            <div className="nodes">
              <div className="rule" />
              <div ref={beamRef} className="beam" />
              {steps.map(([title, body], i) => (
                <div
                  key={title}
                  ref={(el) => {
                    nodeRefs.current[i] = el;
                  }}
                  className="node"
                >
                  <b>{title}</b>
                  <p>{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="st scroll-mt-14" id="standards">
        <div className="wrap">
          <div className="label">Standards</div>
          <p className="statement">
            Clean data starts <span>with clean collection.</span>
          </p>
          <div className="list">
            {standards.map((s) => (
              <details key={s.title}>
                <summary>
                  <span className="t">
                    {s.title}
                    <small>{s.sub}</small>
                  </span>
                  <span className="plus" aria-hidden="true" />
                </summary>
                <div className="x">{s.body}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="st scroll-mt-14" id="contact">
        <div className="wrap">
          <div className="label">Work with us</div>
          <div className="paths" id="contributors">
            <div className="path">
              <span className="label">AI and robotics teams</span>
              <h2>Get in touch.</h2>
              <p>Tell us what your model needs to see or hear. We&apos;ll come back with a plan.</p>
              <Link className="arrow" href={DATA_REQUEST_HREF}>
                Contact us
              </Link>
            </div>
            <div className="path">
              <span className="label">Contributors</span>
              <h2>Get paid to film.</h2>
              <p>Film your work, your home or a conversation. Get paid for every approved hour.</p>
              <Link className="arrow lit" href="/programs">
                See programs
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="st end" id="company">
        <div className="wrap">
          <Mark className="h-[43px] w-auto text-ink" />
          <p className="statement">The physical world, on the record.</p>
          <span className="mail">{CONTACT_EMAIL}</span>
        </div>
      </section>
    </div>
  );
}
