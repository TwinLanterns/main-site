export type Job = {
  slug: "filming" | "gopro" | "speech";
  title: string;
  blurb: string;
  pay: string;
  commitment: string;
  setup: string;
  tags: string[];
  dot: string;
  detailsHref: string;
  applyHref: string;
};

// The open listings. Shown on the landing page and /jobs; edit here only.
export const JOBS: Job[] = [
  {
    slug: "filming",
    title: "Task filmer",
    blurb:
      "Film everyday physical work — cleaning, repair, warehouse — with a head-mounted phone to train robotics AI.",
    pay: "$10/hr",
    commitment: "Flexible, no shifts",
    setup: "Your own phone",
    tags: ["Remote", "No experience"],
    dot: "bg-flame",
    detailsHref: "/earn/info",
    applyHref: "/earn/apply",
  },
  {
    slug: "gopro",
    title: "GoPro home collector",
    blurb:
      "Record first-person video of tidying and organizing in your own home, on a head-mounted GoPro we supply.",
    pay: "$10/valid hr",
    commitment: "Set weekly hours",
    setup: "GoPro supplied",
    tags: ["At home", "Gear provided"],
    dot: "bg-lime",
    detailsHref: "/earn/gopro",
    applyHref: "/earn/gopro/apply",
  },
  {
    slug: "speech",
    title: "Speech participant",
    blurb:
      "Have natural two-person conversations on a body camera we supply, to help train fairer speech-recognition models.",
    pay: "~30 min total",
    commitment: "A few short sessions",
    setup: "Body camera supplied",
    tags: ["Ages 16+", "Indoor + outdoor"],
    dot: "bg-sky",
    detailsHref: "/earn/speech",
    applyHref: "/earn/speech/apply",
  },
];
