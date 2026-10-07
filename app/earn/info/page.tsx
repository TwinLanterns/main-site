import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import Shape from "@/components/Shapes";

export const metadata: Metadata = {
  title: "Earn — Filming info & payouts",
  description:
    "Everything you need to film for Earn: hourly pay, ambassador payout tiers, supported phones, filming rules, and eligible tasks.",
};

const wrap = "mx-auto w-full max-w-[1240px] px-5";
const btn =
  "rounded-full px-8 py-4.5 text-[17px] transition-colors inline-flex items-center justify-center";

/* ----------------------------------- data ----------------------------------- */

const heroStats = [
  ["$10/hr", "for approved filming time"],
  ["Any modern phone", "iPhone 12+ or a recent Pixel / Galaxy S"],
  ["~10 minutes", "to get set up and start"],
];

const ambassadorTiers = [
  { referrals: 20, payout: 100 },
  { referrals: 50, payout: 275 },
  { referrals: 100, payout: 600 },
  { referrals: 200, payout: 1300 },
  { referrals: 300, payout: 2100 },
];
const maxPayout = ambassadorTiers[ambassadorTiers.length - 1].payout;

const devices = [
  {
    label: "iOS",
    kind: "clover" as const,
    color: "text-flame",
    models: [
      "iPhone 12 – 12 Pro Max",
      "iPhone 13 – 13 Pro Max",
      "iPhone 14 – 14 Pro Max",
      "iPhone 15 – 15 Pro Max",
      "iPhone 16 lineup (not 16e)",
      "iPhone 17 lineup (not 17e)",
    ],
  },
  {
    label: "Google Pixel",
    kind: "hex" as const,
    color: "text-sky",
    models: ["Pixel 6 / 6 Pro", "Pixel 7 / 7 Pro", "Pixel 8 / 8 Pro", "Pixel 9 / 9 Pro"],
  },
  {
    label: "Samsung Galaxy S",
    kind: "scallop" as const,
    color: "text-lilac",
    models: [
      "S21 / S21+ / S21 Ultra",
      "S22 / S22+ / S22 Ultra",
      "S23 / S23+ / S23 Ultra",
      "S24 / S24+ / S24 Ultra",
    ],
  },
];

const doList = [
  "Mount the phone on the head strap, tilted down toward your hands",
  "Keep both hands visible in frame roughly 90% of the time",
  "Work at your normal, natural pace — not slowed down for the camera",
  "Film the whole task start to finish, standing or moving",
  "Set your orientation during the 10-second countdown, before it locks",
  "Film in good, even lighting so hands and objects read clearly",
];

const dontList = [
  "Chest-mount, wall-mount, or overhead-mount the camera",
  "Sit or recline while recording — stay on your feet and moving",
  "Flip or rotate the phone once the 10-second countdown locks",
  "Leave hands out of frame for more than about 10% of the clip",
  "Pad the footage with idle time, walking, or waiting around",
  "Repeat one motion for long stretches — trim to a representative clip",
];

const filmingSteps = [
  {
    n: "01",
    t: "Download Partner B",
    b: "Grab the app on iOS or Android and sign in with your email.",
  },
  {
    n: "02",
    t: "Join the organization",
    b: "Enter the invite code we send you so every clip gets credited to you correctly.",
  },
  {
    n: "03",
    t: "Mount & check the frame",
    b: "Head-mount the phone, angle it down about 70°, and confirm both hands sit inside the live preview.",
  },
  {
    n: "04",
    t: "Film the task",
    b: "Pick a task, hit start, and work at a normal pace for at least 2 minutes with no idle time.",
  },
  {
    n: "05",
    t: "Upload & get paid",
    b: "Save the clip, connect to WiFi, and let it upload. Approved footage gets paid out at $10/hr.",
  },
];

const taskGroups = [
  {
    group: "Agriculture & outdoor",
    color: "text-flame",
    kind: "clover" as const,
    tasks: [
      "Hand harvesting",
      "Planting & transplanting",
      "Greenhouse tending",
      "Irrigation setup & repair",
    ],
  },
  {
    group: "Auto & vehicle care",
    color: "text-sky",
    kind: "scallop" as const,
    tasks: ["Car wash & detailing", "Oil & fluid change", "Tire mount & rotation", "Brake pad service"],
  },
  {
    group: "Construction & trades",
    color: "text-lemon",
    kind: "hex" as const,
    tasks: ["Drywall & taping", "Painting & priming", "Plumbing & HVAC installs", "Site cleanup"],
  },
  {
    group: "Cleaning & janitorial",
    color: "text-lilac",
    kind: "burst" as const,
    tasks: ["Floor stripping & waxing", "Window & glass cleaning", "Restroom restock", "Carpet extraction"],
  },
  {
    group: "Food & hospitality",
    color: "text-lime",
    kind: "arch" as const,
    tasks: ["Line cooking & food prep", "Dishwashing", "Hotel housekeeping", "Event setup & teardown"],
  },
  {
    group: "Warehouse & logistics",
    color: "text-flame",
    kind: "squircle" as const,
    tasks: ["Order picking", "Packing & labeling", "Receiving & unloading", "Inventory counts"],
  },
  {
    group: "Manufacturing & repair",
    color: "text-sky",
    kind: "clover" as const,
    tasks: ["Assembly & joinery", "Grinding & deburring", "Device repair", "Weld inspection"],
  },
  {
    group: "Personal care & home",
    color: "text-lilac",
    kind: "hex" as const,
    tasks: ["Pet grooming", "Salon styling", "Furniture assembly", "Home repairs"],
  },
];

const autoFail = [
  "Obstructed, tilted, shaky, or poorly lit footage",
  "Hands out of frame more than 10% during the task",
  "Seated or reclined while recording",
  "Staged, unnatural, or robotic-looking motion",
  "Captured without proper authorization or consent",
];

/* ----------------------------------- hero ------------------------------------ */

function Hero() {
  return (
    <section className="relative overflow-hidden bg-ink pb-16 pt-36 text-white sm:pb-24 sm:pt-44">
      <div className="pointer-events-none absolute inset-0 hidden lg:block">
        <Shape
          kind="arch"
          className="absolute -left-12 top-[18%] w-44 text-sky/25"
          rotate={-12}
          float
        />
        <Shape
          kind="burst"
          className="absolute -right-10 bottom-[12%] w-40 text-lilac/25"
          rotate={14}
          float
          delay={1.3}
        />
        <Shape
          kind="hex"
          className="absolute right-[9%] top-[10%] w-20 text-lemon/20"
          rotate={18}
          float
          delay={0.6}
        />
        <Shape
          kind="clover"
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
            Earn — Part Time Internship Program
          </span>

          <h1 className="display mx-auto mt-7 max-w-[18ch] text-[clamp(2.4rem,6vw,4.6rem)]">
            Pay, payouts and everything you need to film.
          </h1>

          <p className="mx-auto mt-6 max-w-[54ch] text-[17px] leading-relaxed text-white/65 sm:text-[18px]">
            Earn pays you to film everyday work — cleaning, repair, warehouse,
            the physical stuff — to help train robotics AI. Here&apos;s the
            pay, the gear you need, and exactly how to shoot footage that gets
            approved.
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link
              href="/earn/apply"
              className={`${btn} bg-white text-ink hover:bg-flame hover:text-white`}
            >
              Start earning
            </Link>
            <Link
              href="/earn/refer"
              className={`${btn} border border-white/25 text-white hover:border-white`}
            >
              Become an ambassador
            </Link>
            <Link
              href="/earn/gopro"
              className={`${btn} bg-lime text-ink hover:bg-white`}
            >
              GoPro home program
            </Link>
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

/* ------------------------------- pay & ambassadors ---------------------------- */

function PayAmbassador() {
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
            <p className="label">Filming pay</p>
            <p className="display mt-6 text-[clamp(3rem,6vw,4.5rem)]">
              $10<span className="text-[0.4em] text-muted">/hr</span>
            </p>
            <p className="mt-6 max-w-[42ch] text-[15.5px] leading-relaxed text-muted">
              You&apos;re paid $10 an hour for approved filming time — no
              invoices, no chasing hours. Shoot whenever it suits you, upload
              over WiFi, and get paid once your footage clears review.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="flex h-full flex-col rounded-[32px] border border-white/15 bg-white/[0.03] p-8 sm:p-12">
            <p className="label !text-white/50">Ambassador payouts</p>
            <h2 className="display mt-4 max-w-[16ch] text-[clamp(1.7rem,2.6vw,2.2rem)]">
              Refer people, get paid in tiers.
            </h2>
            <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-white/65">
              The more people you bring in who qualify, the bigger the
              payout. Tiers stack — hit 300 referrals and you&apos;ve earned
              every tier along the way.
            </p>

            <div className="mt-9 space-y-4">
              {ambassadorTiers.map((tier) => (
                <div key={tier.referrals} className="flex items-center gap-4">
                  <span className="w-[92px] shrink-0 text-[14px] text-white/55">
                    {tier.referrals} referred
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-flame"
                      style={{ width: `${(tier.payout / maxPayout) * 100}%` }}
                    />
                  </div>
                  <span className="display w-[76px] shrink-0 text-right text-[19px]">
                    ${tier.payout.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------ devices --------------------------------- */

function Devices() {
  return (
    <section className="border-t border-white/10 bg-ink py-20 text-white sm:py-28">
      <div className={wrap}>
        <Reveal className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:items-end">
          <h2 className="display max-w-[13ch] text-[clamp(2rem,4.6vw,3.2rem)]">
            Any of these phones will work.
          </h2>
          <p className="max-w-md text-[15.5px] leading-relaxed text-white/60 lg:pb-2">
            You just need a supported phone, a steady internet connection, and
            a task worth filming.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-3">
          {devices.map((d, i) => (
            <Reveal key={d.label} delay={i * 0.06}>
              <div className="flex items-center gap-3 border-b border-white/25 pb-3">
                <Shape kind={d.kind} className={`h-5 w-5 ${d.color}`} />
                <h3 className="text-[15px] font-medium">{d.label}</h3>
              </div>
              <ul className="mt-5 space-y-3">
                {d.models.map((m) => (
                  <li key={m} className="text-[15px] text-white/55">
                    {m}
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

/* ------------------------------------ do/don't --------------------------------- */

function DoDont() {
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
          <p className="label">Filming rules</p>
          <h2 className="display mt-4 text-[clamp(2rem,4.6vw,3.4rem)]">
            What gets approved, what gets rejected.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-5 lg:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-[32px] border border-lime/40 bg-lime/10 p-8 sm:p-10">
              <span className="label inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white px-3.5 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-lime" />
                Do
              </span>
              <ul className="mt-6 space-y-4">
                {doList.map((pt) => (
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
                Don&apos;t
              </span>
              <ul className="mt-6 space-y-4">
                {dontList.map((pt) => (
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
          <div className="mt-8 rounded-[24px] border border-line bg-shell p-7 sm:p-8">
            <p className="label">Automatic rejection</p>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {autoFail.map((pt) => (
                <li key={pt} className="flex gap-3.5 text-[14.5px] leading-relaxed text-muted">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink/30" />
                  {pt}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------ steps ------------------------------------ */

function Steps() {
  return (
    <section className="bg-ink py-20 text-white sm:py-28">
      <div className={wrap}>
        <Reveal className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:items-end">
          <h2 className="display max-w-[13ch] text-[clamp(2rem,4.6vw,3.2rem)]">
            From download to your first payout.
          </h2>
          <p className="max-w-md text-[15.5px] leading-relaxed text-white/60 lg:pb-2">
            Five steps, none of them take longer than a few minutes.
          </p>
        </Reveal>

        <ol className="mt-14 border-t border-white/10">
          {filmingSteps.map((s, i) => (
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

/* ------------------------------------ tasks ------------------------------------ */

function Tasks() {
  return (
    <section className="border-t border-white/10 bg-ink py-20 text-white sm:py-28">
      <div className={wrap}>
        <Reveal className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:items-end">
          <h2 className="display max-w-[15ch] text-[clamp(2rem,4.6vw,3.2rem)]">
            Real work, from a wide range of settings.
          </h2>
          <p className="max-w-md text-[15.5px] leading-relaxed text-white/60 lg:pb-2">
            Any genuine, hands-on, non-residential task with clear consent
            qualifies. A few of the categories we see most:
          </p>
        </Reveal>

        <div className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {taskGroups.map((g, i) => (
            <Reveal key={g.group} delay={i * 0.04}>
              <div className="flex items-center gap-3 border-b border-white/25 pb-3">
                <Shape kind={g.kind} className={`h-5 w-5 ${g.color}`} />
                <h3 className="text-[14.5px] font-medium">{g.group}</h3>
              </div>
              <ul className="mt-5 space-y-3">
                {g.tasks.map((t) => (
                  <li key={t} className="text-[14.5px] text-white/55">
                    {t}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1}>
          <p className="mt-12 max-w-[62ch] text-[14px] leading-relaxed text-white/50">
            Excluded by default: residential/household settings, sensitive
            areas, minors, private documents, and any unsafe or regulated
            activity.
          </p>
        </Reveal>
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
            Ready to start filming?
          </h2>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              href="/earn/apply"
              className={`${btn} bg-white text-ink hover:bg-flame hover:text-white`}
            >
              Start earning
            </Link>
            <Link
              href="/earn/refer"
              className={`${btn} border border-white/25 text-white hover:border-white`}
            >
              Become an ambassador
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------------- */

export default function EarnInfoPage() {
  return (
    <>
      <Hero />
      <PayAmbassador />
      <Devices />
      <DoDont />
      <Steps />
      <Tasks />
      <Cta />
    </>
  );
}
