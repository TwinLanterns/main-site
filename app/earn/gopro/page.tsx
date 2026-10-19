import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import Shape from "@/components/Shapes";

export const metadata: Metadata = {
  title: "Earn — Get paid to tidy your own home",
  description:
    "Earn $10 for every approved hour — $500+ per home — recording yourself tidying your own home on a GoPro we supply. 18+, 50+ hours over 40 days.",
};

const wrap = "mx-auto w-full max-w-[1240px] px-5";
const btn =
  "rounded-full px-8 py-4.5 text-[17px] transition-colors inline-flex items-center justify-center";

/* ----------------------------------- data ----------------------------------- */

const heroStats = [
  ["$500+", "per home, paid on approved hours"],
  ["$10/hr", "for every approved hour you record"],
  ["50+ hrs in 40 days", "on your own schedule, at home"],
];

const perks = [
  ["GoPro supplied", "head-mounted camera and SD cards, at no cost to you"],
  ["Zero commute", "you record in the rooms you already live in"],
  ["We collect the footage", "we collect your SD cards and send fresh ones"],
  ["Fast feedback", "every video reviewed within 24 hours"],
];

const whoCanJoin = [
  "18 or older",
  "Your home has a few rooms to tidy — a kitchen, bedroom, living room or similar",
  "You can record 50+ hours within 40 days, whenever suits you",
  "You can keep other people — especially kids — out of frame while you record",
  "You're comfortable with your footage being used to train AI and robotics systems",
];

const steps = [
  {
    n: "01",
    t: "Sign up",
    b: "Tell us a little about you and your home. If it's a fit, we'll reach out.",
  },
  {
    n: "02",
    t: "Get certified",
    b: "A quick training shows you exactly how to record footage that gets approved. Pass it and you're in.",
  },
  {
    n: "03",
    t: "Get your GoPro",
    b: "We get a head-mounted GoPro and SD cards to you. Nothing to buy.",
  },
  {
    n: "04",
    t: "Tidy and record",
    b: "Work room by room — dishes into the sink, clothes into the basket, toys into bins. Fit it in whenever works for you — 50+ hours within 40 days.",
  },
  {
    n: "05",
    t: "We collect your footage",
    b: "We collect your recorded SD cards on a regular schedule, or swap in an empty one so you never have to stop.",
  },
  {
    n: "06",
    t: "Get paid",
    b: "Every video is reviewed within 24 hours. You earn $10 for every approved hour, 50+ hours per home.",
  },
];

const recordTips = [
  "Off camera, set each room up in its messy starting state",
  "Keep your hands in frame the whole time",
  "Pick up or move one object at a time",
  "Move at a steady, controlled pace",
  "Spread your time across different rooms",
];

const privacySweep = [
  "Do a quick privacy check before every take",
  "Make sure nobody else is in frame",
  "Kids must never appear in or near the frame",
  "Hide anything personal — mail, screens, documents",
];

const dressCode = [
  "Hair tied back",
  "Sleeves up",
  "Closed-toe shoes",
  "No gloves",
  "No hats",
];

const payRules = [
  {
    t: "Every video gets a look",
    b: "Our QA team reviews 100% of your footage within 24 hours, checking things like task execution, motion speed, lighting, camera setup and privacy.",
  },
  {
    t: "Pass or fail, per video",
    b: "Each video is judged as a whole. Videos rated Perfect or Medium count toward your paid hours.",
  },
  {
    t: "You're paid on approved hours",
    b: "Payment is based on approved video hours — not time spent or raw footage — so clean takes are money in your pocket.",
  },
  {
    t: "Daily feedback",
    b: "You'll hear what passed, what didn't and why, so you can fix it on the next take and keep your approval rate high.",
  },
];

/* ----------------------------------- hero ------------------------------------ */

function Hero() {
  return (
    <section className="relative overflow-hidden tl-dark bg-ink pb-16 pt-36 text-white sm:pb-24 sm:pt-44">
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
            New · GoPro home program
          </span>

          <h1 className="display mx-auto mt-7 max-w-[16ch] text-[clamp(2.4rem,6vw,4.6rem)]">
            Get paid to tidy up your own home.
          </h1>

          <p className="mx-auto mt-6 max-w-[56ch] text-[17px] leading-relaxed text-white/65 sm:text-[18px]">
            Put on a GoPro we supply, tidy and organize the rooms you already
            live in, and earn $10 for every approved hour — $500+ per home. No
            commute, no boss over your shoulder, just your own space on your
            own time.
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link
              href="/earn/gopro/apply"
              className={`${btn} bg-lime text-ink hover:bg-white`}
            >
              Start earning
            </Link>
            <a
              href="#how"
              className={`${btn} border border-white/25 hover:border-white`}
            >
              How it works
            </a>
          </div>

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
    <section className="border-t border-white/10 tl-dark bg-ink py-20 text-white sm:py-28">
      <div className={`${wrap} grid gap-6 lg:grid-cols-2`}>
        <Reveal>
          <div className="relative flex h-full flex-col overflow-hidden rounded-[32px] border border-amber/30 bg-amber/[0.05] p-8 text-white sm:p-12">
            <Shape
              kind="clover"
              className="pointer-events-none absolute -right-10 -top-10 w-40 text-ink/10"
              rotate={18}
            />
            <p className="label">What you earn</p>
            <p className="display mt-6 text-[clamp(3rem,6vw,4.5rem)]">
              $10<span className="text-[0.4em] text-muted">/approved hr</span>
            </p>
            <p className="mt-6 max-w-[42ch] text-[15.5px] leading-relaxed text-muted">
              Each home records 50+ hours within 40 days — that&apos;s $500+
              for tidying the place you live in anyway. The camera and SD
              cards are on us.
            </p>
            <dl className="mt-auto grid grid-cols-2 gap-x-6 gap-y-6 border-t border-line pt-8">
              {[
                ["Any rooms", "kitchen, bedroom and more"],
                ["40 days", "to record your hours"],
                ["50+ hrs", "per home"],
                ["$500+", "per home"],
              ].map(([k, v]) => (
                <div key={v}>
                  <dt className="display text-[clamp(1.4rem,2.2vw,1.8rem)]">{k}</dt>
                  <dd className="mt-1.5 text-[14px] text-muted">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="flex h-full flex-col rounded-[32px] border border-white/15 bg-white/[0.03] p-8 sm:p-12">
            <p className="label !text-white/50">What you get</p>
            <h2 className="display mt-4 max-w-[16ch] text-[clamp(1.7rem,2.6vw,2.2rem)]">
              We handle the gear. You handle the mess.
            </h2>
            <dl className="mt-9 space-y-6 border-t border-white/10 pt-8">
              {perks.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[17px] font-medium">{k}</dt>
                  <dd className="mt-1 text-[14.5px] text-white/55">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------------------------- who can join -------------------------------- */

function WhoCanJoin() {
  return (
    <section className="border-t border-white/10 tl-dark bg-ink py-20 text-white sm:py-28">
      <div className={`${wrap} grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start`}>
        <Reveal>
          <p className="label !text-white/50">Who can join</p>
          <h2 className="display mt-4 max-w-[14ch] text-[clamp(2rem,4.6vw,3.2rem)]">
            If this sounds like you, you&apos;re in.
          </h2>
          <p className="mt-5 max-w-md text-[15.5px] leading-relaxed text-white/60">
            No experience, résumé or interview needed. You just need a home to
            tidy and time to record 50+ hours over 40 days.
          </p>
        </Reveal>

        <Reveal delay={0.06}>
          <ul className="space-y-4">
            {whoCanJoin.map((p) => (
              <li
                key={p}
                className="flex gap-4 rounded-[20px] border border-white/10 bg-white/[0.03] p-5 text-[15.5px] leading-relaxed text-white/75"
              >
                <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lime text-[11px] text-ink">
                  ✓
                </span>
                {p}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------------------------- how it works -------------------------------- */

function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-24 border-t border-white/10 tl-dark bg-ink py-20 text-white sm:py-28">
      <div className={wrap}>
        <Reveal className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:items-end">
          <h2 className="display max-w-[14ch] text-[clamp(2rem,4.6vw,3.2rem)]">
            From sign-up to payday.
          </h2>
          <p className="max-w-md text-[15.5px] leading-relaxed text-white/60 lg:pb-2">
            Six simple steps. We ship the gear, collect the footage and review
            it fast — you just tidy up.
          </p>
        </Reveal>

        <ol className="mt-14 border-t border-white/10">
          {steps.map((s, i) => (
            <Reveal as="li" key={s.n} delay={i * 0.04}>
              <div className="group grid items-start gap-4 border-b border-white/10 py-8 sm:grid-cols-[64px_minmax(0,1fr)] sm:gap-8 lg:grid-cols-[64px_minmax(0,260px)_minmax(0,1fr)]">
                <span className="display text-[clamp(1.6rem,2.4vw,2rem)] text-lime">
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

/* ----------------------------------- recording ---------------------------------- */

function Recording() {
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
          <p className="label">Recording tips</p>
          <h2 className="display mt-4 text-[clamp(2rem,4.6vw,3.4rem)]">
            Get every hour approved.
          </h2>
          <p className="mt-5 text-[16px] leading-relaxed text-muted">
            Follow these and your footage sails through review.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 lg:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-[32px] border border-lime/40 bg-lime/10 p-8 sm:p-10">
              <span className="label inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white px-3.5 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-lime" />
                While you record
              </span>
              <ul className="mt-6 space-y-4">
                {recordTips.map((pt) => (
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
                Privacy check
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
              <p className="label">What to wear</p>
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
              <p className="label">Where to record</p>
              <p className="mt-5 text-[14.5px] leading-relaxed text-muted">
                Any rooms you live in — kitchen, bedroom, living room, laundry
                room, dining room, bathrooms and more. Mix it up across
                spaces.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------- pay -------------------------------------- */

function Pay() {
  return (
    <section className="tl-dark bg-ink py-20 text-white sm:py-28">
      <div className={wrap}>
        <Reveal className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:items-end">
          <h2 className="display max-w-[15ch] text-[clamp(2rem,4.6vw,3.2rem)]">
            How you get paid.
          </h2>
          <p className="max-w-md text-[15.5px] leading-relaxed text-white/60 lg:pb-2">
            Simple and transparent: approved hours times $10.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2">
          {payRules.map((r, i) => (
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
    <section className="relative overflow-hidden border-t border-white/10 tl-dark bg-ink py-24 text-white sm:py-32">
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
          <h2 className="display mx-auto max-w-[16ch] text-[clamp(2.2rem,5.6vw,4rem)]">
            Your home. Your hours. $500+.
          </h2>
          <p className="mx-auto mt-6 max-w-[48ch] text-[17px] leading-relaxed text-white/60">
            Spots are limited. Sign up now and we&apos;ll be in touch.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              href="/earn/gopro/apply"
              className={`${btn} bg-lime text-ink hover:bg-white`}
            >
              Start earning
            </Link>
            <Link
              href="/programs"
              className={`${btn} border border-white/25 text-white hover:border-white`}
            >
              See all programs
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------------- */

export default function EarnGoProPage() {
  return (
    <>
      <Hero />
      <Overview />
      <WhoCanJoin />
      <HowItWorks />
      <Recording />
      <Pay />
      <Cta />
    </>
  );
}
