import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import Shape from "@/components/Shapes";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  path: "/earn/speech",
  title: "Earn — Speech conversation program",
  description:
    "Just talk: pair up for easy two-person conversations, indoors and out around Los Angeles, on a body camera we supply. A few sessions and you're done. Ages 16+.",
});

const wrap = "mx-auto w-full max-w-[1240px] px-5";
const btn =
  "rounded-full px-8 py-4.5 text-[17px] transition-colors inline-flex items-center justify-center";

/* ----------------------------------- data ----------------------------------- */

const heroStats = [
  ["200 spots", "open to participants"],
  ["~30 min", "of your speech each"],
  ["50 / 50", "indoor and outdoor"],
];

const howItWorks = [
  {
    n: "01",
    t: "You're paired up",
    b: "Every recording is a conversation between two participants — never a solo recording. You can be paired with anyone; varied, natural pairings are preferred.",
  },
  {
    n: "02",
    t: "Pick up your batch",
    b: "Each group works through one batch of materials. We provide everything: scripted dialogs to read, and prompts to talk about. You don't write anything.",
  },
  {
    n: "03",
    t: "Record, indoors and outdoors",
    b: "A chest-mounted body camera, supplied by us, records the conversation as one continuous file. Roughly half your sessions are indoors and half outdoors — streets, parking lots, parks, plazas and sidewalks.",
  },
  {
    n: "04",
    t: "Repeat until you hit ~30 minutes",
    b: "A 30-minute conversation yields about 15 minutes of speech per person, so you'll take part in several sessions. You're done once your own speech reaches roughly 30 minutes (27–33 is fine).",
  },
];

const modes = [
  {
    label: "Free-form dialog",
    share: "~55%",
    body: "Two people hold an unscripted conversation in response to a prompt we give you.",
    color: "border-lime/40 bg-lime/10",
    dot: "bg-lime",
  },
  {
    label: "Scripted dialog",
    share: "~45%",
    body: "Two people perform a pre-written dialog. Slips, mistakes and stumbles are normal and totally fine — no re-takes needed.",
    color: "border-sky/40 bg-sky/10",
    dot: "bg-sky",
  },
];

const whoWeNeed = [
  "Ages 16 and up — teens, adults and seniors are all welcome",
  "A mix of backgrounds, accents and regions across the United States",
  "Comfortable talking naturally in English with another person",
  "Able to join several sessions, indoors and outdoors",
  "Willing to sign a written release covering use of your voice recordings to train and evaluate speech-recognition systems",
];

const recordingRules = [
  "Use the body camera exactly as supplied — don't change any of its settings",
  "Talk at a normal conversational distance, standing or seated",
  "Record each conversation as one continuous take",
  "Ordinary room noise, wind and traffic are expected — just keep speech understandable",
  "Speak naturally and keep your own way of talking; never \"correct\" your grammar or accent",
];

const consentPoints = [
  {
    t: "Written consent, specific to voice",
    b: "Every participant signs a release that specifically covers using voice recordings to train and evaluate speech-recognition systems. Generic media releases don't count.",
  },
  {
    t: "Voice can be biometric data",
    b: "Some state laws treat voice recordings as biometric identifiers, so consent, retention and deletion are handled with that in mind.",
  },
  {
    t: "Under 18",
    b: "Participants aged 16–17 need written consent from a parent or legal guardian in addition to their own agreement. Nobody under 16 can take part.",
  },
];

/* ----------------------------------- hero ------------------------------------ */

function Hero() {
  return (
    <section className="relative overflow-hidden tl-dark bg-ink pb-16 pt-36 text-white sm:pb-24 sm:pt-44">
      <div className="pointer-events-none absolute inset-0 hidden lg:block">
        <Shape
          kind="hex"
          className="absolute -left-12 top-[18%] w-44 text-sky/25"
          rotate={-12}
          float
        />
        <Shape
          kind="clover"
          className="absolute -right-10 bottom-[12%] w-40 text-lilac/25"
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
          className="absolute bottom-[8%] left-[9%] w-24 text-lime/25"
          rotate={-8}
          float
          delay={1.9}
        />
      </div>

      <div className={`${wrap} relative text-center`}>
        <Reveal>
          <span className="label inline-flex items-center gap-2.5 rounded-full border border-white/20 px-4 py-2 !text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-lime" />
            New · Speech program · Los Angeles
          </span>

          <h1 className="display mx-auto mt-7 max-w-[18ch] text-[clamp(2.4rem,6vw,4.6rem)]">
            Just talk. Help tech hear every voice.
          </h1>

          <p className="mx-auto mt-6 max-w-[56ch] text-[17px] leading-relaxed text-white/65 sm:text-[18px]">
            Pair up for easy two-person conversations — some from a short
            script, some free-flowing — indoors and out around town. We supply
            the body camera and every script and prompt. A few sessions and
            you&apos;re done, and voice technology works better for people of
            every background, age and accent.
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link
              href="/earn/speech/apply"
              className={`${btn} bg-lime text-ink hover:bg-white`}
            >
              Sign up now
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

/* --------------------------------- how it works -------------------------------- */

function HowItWorks() {
  return (
    <section className="border-t border-white/10 tl-dark bg-ink py-20 text-white sm:py-28">
      <div className={wrap}>
        <Reveal className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:items-end">
          <h2 className="display max-w-[14ch] text-[clamp(2rem,4.6vw,3.2rem)]">
            How a session works.
          </h2>
          <p className="max-w-md text-[15.5px] leading-relaxed text-white/60 lg:pb-2">
            Every recording is a conversation between two people, captured on
            a body camera we hand you.
          </p>
        </Reveal>

        <ol className="mt-14 border-t border-white/10">
          {howItWorks.map((s, i) => (
            <Reveal as="li" key={s.n} delay={i * 0.04}>
              <div className="grid items-start gap-4 border-b border-white/10 py-8 sm:grid-cols-[64px_minmax(0,1fr)] sm:gap-8 lg:grid-cols-[64px_minmax(0,260px)_minmax(0,1fr)]">
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

/* ----------------------------------- modes ------------------------------------- */

function Modes() {
  return (
    <section className="relative overflow-hidden bg-white py-20 text-ink sm:py-28">
      <div className={`${wrap} relative`}>
        <Reveal className="mx-auto max-w-[46ch] text-center">
          <p className="label">Two kinds of conversation</p>
          <h2 className="display mt-4 text-[clamp(2rem,4.6vw,3.4rem)]">
            Scripted and free-form.
          </h2>
          <p className="mt-5 text-[15.5px] leading-relaxed text-muted">
            Your time is split roughly evenly between indoors and outdoors,
            and both settings include both kinds of conversation.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 lg:grid-cols-2">
          {modes.map((m, i) => (
            <Reveal key={m.label} delay={i * 0.08}>
              <div className={`h-full rounded-[32px] border p-8 sm:p-10 ${m.color}`}>
                <span className="label inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white px-3.5 py-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
                  {m.label}
                </span>
                <p className="display mt-6 text-[clamp(2.4rem,4vw,3.2rem)]">
                  {m.share}
                </p>
                <p className="mt-3 max-w-[40ch] text-[15px] leading-relaxed text-ink/75">
                  {m.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------ who -------------------------------------- */

function Who() {
  return (
    <section className="border-t border-white/10 tl-dark bg-ink py-20 text-white sm:py-28">
      <div className={`${wrap} grid gap-12 lg:grid-cols-2`}>
        <Reveal>
          <h2 className="display max-w-[14ch] text-[clamp(2rem,4.6vw,3.2rem)]">
            Who can take part.
          </h2>
          <p className="mt-5 max-w-[46ch] text-[15.5px] leading-relaxed text-white/60">
            We&apos;re deliberately recruiting a wide range of voices —
            different ages, backgrounds, accents and regions — because the
            goal is a model that works well for everyone. The sign-up form asks a
            few background questions so we can balance the group.
          </p>
          <ul className="mt-8 space-y-4">
            {whoWeNeed.map((pt) => (
              <li key={pt} className="flex gap-3.5 text-[15px] leading-relaxed text-white/70">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-lime" />
                {pt}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="h-full rounded-[32px] border border-white/15 bg-white/[0.03] p-8 sm:p-10">
            <p className="label !text-white/50">Recording ground rules</p>
            <ul className="mt-6 space-y-4">
              {recordingRules.map((pt) => (
                <li key={pt} className="flex gap-3.5 text-[15px] leading-relaxed text-white/65">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky" />
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

/* ----------------------------------- consent ----------------------------------- */

function Consent() {
  return (
    <section className="border-t border-white/10 tl-dark bg-ink py-20 text-white sm:py-28">
      <div className={wrap}>
        <Reveal className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:items-end">
          <h2 className="display max-w-[14ch] text-[clamp(2rem,4.6vw,3.2rem)]">
            Consent and privacy.
          </h2>
          <p className="max-w-md text-[15.5px] leading-relaxed text-white/60 lg:pb-2">
            Your voice is personal. Here&apos;s what we ask, and why.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-3">
          {consentPoints.map((r, i) => (
            <Reveal key={r.t} delay={i * 0.05}>
              <div className="h-full rounded-[28px] border border-white/15 bg-white/[0.03] p-8">
                <h3 className="text-[17px] font-medium">{r.t}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-white/60">{r.b}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1}>
          <p className="mt-8 max-w-[70ch] text-[13.5px] leading-relaxed text-white/45">
            Final consent paperwork and compensation details are shared with
            you after you sign up and before any recording begins. Signing up
            is not a commitment.
          </p>
        </Reveal>
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
          <h2 className="display mx-auto max-w-[18ch] text-[clamp(2.2rem,5.6vw,4rem)]">
            Ready to lend your voice?
          </h2>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              href="/earn/speech/apply"
              className={`${btn} bg-lime text-ink hover:bg-white`}
            >
              Sign up now
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

export default function EarnSpeechPage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <Modes />
      <Who />
      <Consent />
      <Cta />
    </>
  );
}
