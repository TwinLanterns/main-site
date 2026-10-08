// The open programs. Single source for the landing carousel, the
// "Open roles" list, the nav menu and the /programs search page — edit here only.
export type Program = {
  slug: "internship" | "gopro" | "speech";
  tag: string;
  title: string;
  /** role name used in lists and menus */
  name: string;
  /** one-line summary for compact lists */
  blurb: string;
  body: string;
  facts: [string, string][];
  location: "Anywhere" | "Los Angeles";
  pay: string;
  commitment: string;
  gear: string;
  /** short chips shown in lists */
  tags: string[];
  /** extra search terms for /programs */
  keywords: string[];
  shape: "clover" | "hex" | "scallop";
  dot: string;
  shapeTone: string;
  primary: string;
  apply: string;
  more: string;
  ambassador: boolean;
};

export const PROGRAMS: Program[] = [
  {
    slug: "internship",
    tag: "Part-time internship · Hiring now",
    name: "Task filmer",
    blurb:
      "Earn $10/hr filming real hands-on work — repair, warehouse, kitchen prep, car care — on the phone you already own. Zero experience needed.",
    title: "Get paid $10 an hour to film everyday work.",
    body: "Already work with your hands? Get paid twice for it. Strap your phone to the head mount we provide, film real hands-on work — repair, warehouse picking, kitchen prep, car care — and help build the next generation of robots. No résumé, no interview, no experience.",
    facts: [
      ["$10/hr", "for every approved hour you film"],
      ["Your phone", "iPhone 12–17, Galaxy S21–S24 or Pixel 6–9"],
      ["Zero experience", "a ten-minute setup is the whole bar"],
    ],
    location: "Anywhere",
    pay: "$10/hr",
    commitment: "Flexible, no shifts",
    gear: "Your phone + our head mount",
    tags: ["Workplace tasks", "No experience", "Flexible hours"],
    keywords: ["robotics", "robots", "filming", "cleaning", "janitorial", "repair", "warehouse", "kitchen", "car wash", "retail", "phone", "internship"],
    shape: "clover",
    dot: "bg-flame",
    shapeTone: "text-flame",
    primary: "bg-flame text-white hover:bg-white hover:text-ink",
    apply: "/earn/apply",
    more: "/earn/info",
    ambassador: true,
  },
  {
    slug: "gopro",
    tag: "New · GoPro home program · Los Angeles",
    name: "GoPro home collector",
    blurb:
      "Earn up to $500 tidying and organizing your own home — $10 for every approved hour, wearing a GoPro we provide.",
    title: "Get paid to tidy up your own home.",
    body: "Wear a GoPro we provide, tidy and organize the rooms you already live in, and earn $10 for every approved hour — up to $500 per household. No commute, no boss over your shoulder, just your own space. 18+.",
    facts: [
      ["Up to $500", "$10 per approved hour, 50 hrs per home"],
      ["GoPro supplied", "head-mounted, delivered to your home"],
      ["From 5 hrs/week", "record on your own time, at home"],
    ],
    location: "Los Angeles",
    pay: "$10/valid hr",
    commitment: "From 5 hrs/week, 50 hrs total",
    gear: "GoPro supplied",
    tags: ["Los Angeles only", "At home", "18+", "Gear provided"],
    keywords: ["gopro", "home", "tidy", "organizing", "cleaning", "first-person", "video"],
    shape: "hex",
    dot: "bg-lime",
    shapeTone: "text-lime",
    primary: "bg-lime text-ink hover:bg-white",
    apply: "/earn/gopro/apply",
    more: "/earn/gopro",
    ambassador: false,
  },
  {
    slug: "speech",
    tag: "New · Speech program · Los Angeles",
    name: "Speech participant",
    blurb:
      "Pair up for easy two-person conversations on a body camera we supply, so voice tech works for every accent and age.",
    title: "Just talk. Help tech hear every voice.",
    body: "Pair up and talk. Read short scripted dialogs and chat through easy prompts — some indoors, some out around town — recorded on a body camera we supply. A few sessions and you're done, and you'll help voice technology understand every accent, age and way of speaking. Ages 16+.",
    facts: [
      ["Just talk", "short scripts and free-flowing chats"],
      ["A few sessions", "done once you hit ~30 min of speech"],
      ["Ages 16+", "teens, adults and seniors welcome"],
    ],
    location: "Los Angeles",
    pay: "Details at sign-up",
    commitment: "A few short sessions",
    gear: "Body camera supplied",
    tags: ["Los Angeles only", "Ages 16+", "Indoor + outdoor"],
    keywords: ["speech", "conversation", "audio", "voice", "talk", "scripted", "body camera"],
    shape: "scallop",
    dot: "bg-sky",
    shapeTone: "text-sky",
    primary: "bg-sky text-ink hover:bg-white",
    apply: "/earn/speech/apply",
    more: "/earn/speech",
    ambassador: false,
  },
];
