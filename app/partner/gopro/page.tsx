import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import Shape from "@/components/Shapes";

export const metadata: Metadata = {
  title: "Partner — GoPro home collection SOP",
  description:
    "Standard operating procedure for Partner's GoPro home-environment egocentric video collection: recruitment, logistics, capture standards, and quality acceptance.",
};

const wrap = "mx-auto w-full max-w-[1240px] px-5";
const btn =
  "rounded-full px-8 py-4.5 text-[17px] transition-colors inline-flex items-center justify-center";

/* ----------------------------------- data ----------------------------------- */

const heroStats = [
  ["1,500–2,500 hrs", "total collection target"],
  ["30–50 households", "planned coverage"],
  ["20–30 days", "target completion window"],
];

const householdMath = [
  ["5", "scenes per household"],
  ["10 hrs", "per scene"],
  ["50 hrs", "per household"],
  ["~5 hrs/day", "across 10 recording days"],
];

const recruitment = [
  {
    label: "Screening criteria",
    kind: "clover" as const,
    color: "text-flame",
    points: [
      "Age 18 or older",
      "Consents to being recorded inside their own residence for AI-training purposes",
      "Home has five core areas: kitchen, bedroom, living room, laundry room and dining room",
      "Can keep other people — children in particular — out of frame for the full recording",
      "Screened against the provided criteria and home-suitability questionnaire",
    ],
  },
  {
    label: "Training & certification",
    kind: "hex" as const,
    color: "text-sky",
    points: [
      "Every operator must pass certification before entering live production",
      "Maintain a backfill pipeline to absorb attrition during certification and production, so the schedule is never interrupted",
    ],
  },
  {
    label: "Scheduling & batches",
    kind: "scallop" as const,
    color: "text-lilac",
    points: [
      "Schedule operators against the weekly ramp plan",
      "Approx. 5 hours per household per day, 10 consecutive days per household",
      "Once a household reaches its 50-hour target, manage batch handover and transition cleanly",
    ],
  },
];

const logistics = [
  {
    n: "01",
    t: "Device issuance & tracking",
    b: "The project supplies up to 300 GoPro units for concurrent use. Distribute devices and SD cards to households at the start of each batch and recover them at batch close. Maintain chain of custody end to end, keep a device ledger, and report damage or loss accurately.",
  },
  {
    n: "02",
    t: "SD card collection",
    b: "Physically collect recorded SD cards from participating households on a fixed daily cadence — or run a card-swap system (pull the full card, insert an empty one) so recording is never interrupted.",
  },
  {
    n: "03",
    t: "Upload within 24 hours",
    b: "Each day's recorded video must be uploaded to the designated storage location within 24 hours of capture. QA turnaround and SLA are counted from the capture date, so late uploads compress the review window.",
  },
  {
    n: "04",
    t: "Data security & privacy",
    b: "Footage shows the interior of private homes. SD cards and video files may be handled only by authorized personnel, with no copying or viewing beyond what upload verification strictly requires. All data is handled under the applicable confidentiality terms.",
  },
];

const dressCode = [
  "Hair tied back and secured",
  "Sleeves up",
  "Closed-toe shoes",
  "No gloves",
  "No hats",
];

const captureRules = [
  "Off camera, stage each room into the specified initial cluttered state",
  "Perform the specified tidying tasks — dishes into the sink or dishwasher, clothes into the laundry basket, toys into bins, parcels organized at the entryway",
  "Keep hands visible in frame at all times",
  "Pick up or move only one object at a time",
  "Keep movement speed strictly controlled",
  "Record in the core areas; bathrooms and other areas may be used as supplementary",
];

const privacySweep = [
  "Run a privacy check before every single take",
  "Confirm no other person is in frame",
  "Children must never appear in or near the frame",
  "Confirm no personal or sensitive information is visible anywhere",
];

const qaRules = [
  {
    t: "100% review",
    b: "Every uploaded video is reviewed — not sampled — by the QA team within 24 hours, across 11 dimensions including scene authenticity, task execution, motion speed, lighting, device setup, and privacy/compliance.",
  },
  {
    t: "Pass or fail, per video",
    b: "Each recorded video is adjudicated as a whole: full pass or full reject, with no partial credit. Only video rated Perfect or Medium counts toward valid approved hours.",
  },
  {
    t: "Only approved hours settle",
    b: "Hours worked, raw recorded duration, and rejected video don't count toward delivery. Only QA-approved video hours are counted and paid.",
  },
  {
    t: "Daily feedback & coaching",
    b: "A daily QA report breaks down approved hours, rejected hours, and specific rejection reasons by operator and date. Use it to coach and correct operators promptly.",
  },
];

/* ----------------------------------- hero ------------------------------------ */

function Hero() {
  return (
    <section className="relative overflow-hidden bg-ink pb-16 pt-36 text-white sm:pb-24 sm:pt-44">
      <div className="pointer-events-none absolute inset-0 hidden lg:block">
        <Shape
          kind="scallop"
          className="absolute -left-12 top-[18%] w-44 text-lime/25"
          rotate={-12}
          float
        />
        <Shape
          kind="arch"
          className="absolute -right-10 bottom-[12%] w-40 text-sky/25"
          rotate={14}
          float
          delay={1.3}
        />
        <Shape
          kind="burst"
          className="absolute right-[9%] top-[10%] w-20 text-lemon/20"
          rotate={18}
          float
          delay={0.6}
        />
        <Shape
          kind="squircle"
          className="absolute bottom-[8%] left-[9%] w-24 text-flame/25"
          rotate={-8}
          float
          delay={1.9}
        />
      </div>

      <div className={`${wrap} relative text-center`}>
        <Reveal>
          <span className="label inline-flex items-center gap-2.5 rounded-full border border-white/20 px-4 py-2 !text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-lime" />
            Partner — Standard Operating Procedure
          </span>

          <h1 className="display mx-auto mt-7 max-w-[18ch] text-[clamp(2.4rem,6vw,4.6rem)]">
            GoPro home-environment video collection.
          </h1>

          <p className="mx-auto mt-6 max-w-[56ch] text-[17px] leading-relaxed text-white/65 sm:text-[18px]">
            Participants wear a head-mounted GoPro and record first-person
            video of themselves tidying and organizing inside their own homes.
            Here&apos;s how recruitment, logistics, capture and quality review
            work.
          </p>

          <dl className="mx-auto mt-12 grid max-w-3xl gap-7 border-t border-white/15 pt-8 sm:grid-cols-3">
            {heroStats.map(([k, v]) => (
              <div key={v}>
                <dt className="display text-[clamp(1.4rem,2.4vw,1.9rem)]">{k}</dt>
                <dd className="mt-2 text-[14px] leading-relaxed text-white/55">{v}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  );
}

/* ----------------------------------- overview --------------------------------- */

function Overview() {
  return (
    <section className="border-t border-white/10 bg-ink py-20 text-white sm:py-28">
      <div className={`${wrap} grid gap-6 lg:grid-cols-2`}>
        <Reveal>
          <div className="relative flex h-full flex-col overflow-hidden rounded-[32px] bg-white p-8 text-ink sm:p-12">
            <Shape
              kind="clover"
              className="pointer-events-none absolute -right-10 -top-10 w-40 text-ink/10"
              rotate={18}
            />
            <p className="label">Budget</p>
            <p className="display mt-6 text-[clamp(3rem,6vw,4.5rem)]">
              $20<span className="text-[0.4em] text-muted">/valid hr</span>
            </p>
            <p className="mt-6 max-w-[42ch] text-[15.5px] leading-relaxed text-muted">
              USD 20 per valid hour, inclusive of recruitment, participant
              incentives, management overhead, and shipping to each household.
              Payment is calculated on QA-approved video hours only.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="flex h-full flex-col rounded-[32px] border border-white/15 bg-white/[0.03] p-8 sm:p-12">
            <p className="label !text-white/50">Per household</p>
            <h2 className="display mt-4 max-w-[16ch] text-[clamp(1.7rem,2.6vw,2.2rem)]">
              Five scenes, fifty hours.
            </h2>
            <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-white/65">
              All capture takes place in private residences. If 30–50
              households doesn&apos;t fit, propose an alternative plan you
              consider workable.
            </p>

            <dl className="mt-9 grid grid-cols-2 gap-x-6 gap-y-7 border-t border-white/10 pt-8">
              {householdMath.map(([k, v]) => (
                <div key={v}>
                  <dt className="display text-[clamp(1.4rem,2.2vw,1.8rem)]">{k}</dt>
                  <dd className="mt-1.5 text-[14px] text-white/55">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------------------------- recruitment -------------------------------- */

function Recruitment() {
  return (
    <section className="border-t border-white/10 bg-ink py-20 text-white sm:py-28">
      <div className={wrap}>
        <Reveal className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:items-end">
          <h2 className="display max-w-[14ch] text-[clamp(2rem,4.6vw,3.2rem)]">
            Recruitment and workforce.
          </h2>
          <p className="max-w-md text-[15.5px] leading-relaxed text-white/60 lg:pb-2">
            Who can take part, how they get certified, and how batches are
            scheduled.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-3">
          {recruitment.map((r, i) => (
            <Reveal key={r.label} delay={i * 0.06}>
              <div className="flex items-center gap-3 border-b border-white/25 pb-3">
                <Shape kind={r.kind} className={`h-5 w-5 ${r.color}`} />
                <h3 className="text-[15px] font-medium">{r.label}</h3>
              </div>
              <ul className="mt-5 space-y-3">
                {r.points.map((p) => (
                  <li key={p} className="text-[15px] leading-relaxed text-white/55">
                    {p}
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

/* ---------------------------------- logistics ---------------------------------- */

function Logistics() {
  return (
    <section className="border-t border-white/10 bg-ink py-20 text-white sm:py-28">
      <div className={wrap}>
        <Reveal className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:items-end">
          <h2 className="display max-w-[14ch] text-[clamp(2rem,4.6vw,3.2rem)]">
            Equipment and data logistics.
          </h2>
          <p className="max-w-md text-[15.5px] leading-relaxed text-white/60 lg:pb-2">
            From handing out cameras to getting footage uploaded — and keeping
            it private the whole way.
          </p>
        </Reveal>

        <ol className="mt-14 border-t border-white/10">
          {logistics.map((s, i) => (
            <Reveal as="li" key={s.n} delay={i * 0.04}>
              <div className="group grid items-start gap-4 border-b border-white/10 py-8 sm:grid-cols-[64px_minmax(0,1fr)] sm:gap-8 lg:grid-cols-[64px_minmax(0,260px)_minmax(0,1fr)]">
                <span className="display text-[clamp(1.6rem,2.4vw,2rem)] text-white/40">
                  {s.n}
                </span>
                <h3 className="text-[17px] font-medium">{s.t}</h3>
                <p className="max-w-[56ch] text-[15px] leading-relaxed text-white/60">
                  {s.b}
                </p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ----------------------------------- capture ----------------------------------- */

function Capture() {
  return (
    <section className="relative overflow-hidden bg-white py-20 text-ink sm:py-28">
      <div className="pointer-events-none absolute inset-0 hidden lg:block">
        <Shape
          kind="hex"
          className="absolute -left-8 top-[10%] w-28 text-lemon/40"
          rotate={-12}
          float
        />
        <Shape
          kind="clover"
          className="absolute -right-6 bottom-[8%] w-32 text-flame/25"
          rotate={12}
          float
          delay={1.1}
        />
      </div>

      <div className={`${wrap} relative`}>
        <Reveal className="mx-auto max-w-[46ch] text-center">
          <p className="label">On-site capture</p>
          <h2 className="display mt-4 text-[clamp(2rem,4.6vw,3.4rem)]">
            How every take should be set up and shot.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-5 lg:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-[32px] border border-lime/40 bg-lime/10 p-8 sm:p-10">
              <span className="label inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white px-3.5 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-lime" />
                Scene & task execution
              </span>
              <ul className="mt-6 space-y-4">
                {captureRules.map((pt) => (
                  <li key={pt} className="flex gap-3.5 text-[15px] leading-relaxed text-ink/75">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-lime" />
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="h-full rounded-[32px] border border-flame/35 bg-flame/10 p-8 sm:p-10">
              <span className="label inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white px-3.5 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-flame" />
                Privacy sweep
              </span>
              <ul className="mt-6 space-y-4">
                {privacySweep.map((pt) => (
                  <li key={pt} className="flex gap-3.5 text-[15px] leading-relaxed text-ink/75">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-flame" />
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.12}>
          <div className="mt-8 grid gap-8 rounded-[24px] border border-line bg-shell p-7 sm:p-8 lg:grid-cols-2">
            <div>
              <p className="label">Dress & appearance</p>
              <ul className="mt-5 flex flex-wrap gap-2.5">
                {dressCode.map((d) => (
                  <li
                    key={d}
                    className="rounded-full border border-ink/15 bg-white px-4 py-2 text-[14px] text-ink/75"
                  >
                    {d}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="label">Area rules</p>
              <p className="mt-5 text-[14.5px] leading-relaxed text-muted">
                Core areas are the kitchen, bedroom, living room, laundry room
                and dining room. Cumulative recording in any single area is
                capped at 10 hours.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------- qa -------------------------------------- */

function Quality() {
  return (
    <section className="bg-ink py-20 text-white sm:py-28">
      <div className={wrap}>
        <Reveal className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:items-end">
          <h2 className="display max-w-[15ch] text-[clamp(2rem,4.6vw,3.2rem)]">
            Quality review and acceptance.
          </h2>
          <p className="max-w-md text-[15.5px] leading-relaxed text-white/60 lg:pb-2">
            Every video is checked against the quality rubric, and only
            approved hours count.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2">
          {qaRules.map((r, i) => (
            <Reveal key={r.t} delay={i * 0.05}>
              <div className="h-full rounded-[28px] border border-white/15 bg-white/[0.03] p-8">
                <h3 className="text-[17px] font-medium">{r.t}</h3>
                <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-white/60">
                  {r.b}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------- cta ------------------------------------- */

function Cta() {
  return (
    <section className="relative overflow-hidden border-t border-white/10 bg-ink py-24 text-white sm:py-32">
      <Shape
        kind="squircle"
        className="pointer-events-none absolute -left-10 top-16 w-32 text-blush/30"
        float
      />
      <Shape
        kind="burst"
        className="pointer-events-none absolute -right-8 bottom-10 w-32 text-lime/30"
        float
        delay={1.4}
        rotate={12}
      />
      <div className={`${wrap} relative text-center`}>
        <Reveal>
          <h2 className="display mx-auto max-w-[18ch] text-[clamp(2.2rem,5.6vw,4rem)]">
            Looking for the phone-based program?
          </h2>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              href="/partner/info"
              className={`${btn} bg-white text-ink hover:bg-flame hover:text-white`}
            >
              Partner filming info
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------------- */

export default function PartnerGoProPage() {
  return (
    <>
      <Hero />
      <Overview />
      <Recruitment />
      <Logistics />
      <Capture />
      <Quality />
      <Cta />
    </>
  );
}
