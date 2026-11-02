import Link from "next/link";
import Mark from "./Mark";
import { DATA_REQUEST_HREF } from "@/lib/site";

const columns = [
  {
    title: "Data",
    links: [
      { href: "/#data", label: "Egocentric video" },
      { href: "/#data", label: "In-home video" },
      { href: "/#data", label: "Speech" },
      { href: "/#standards", label: "Standards" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: DATA_REQUEST_HREF, label: "Contact us" },
      { href: "/#platform", label: "Platform" },
      { href: "/demo", label: "Operations demo" },
      { href: "/companies", label: "Hire a student" },
      { href: "/apply", label: "Student applications" },
    ],
  },
  {
    title: "Contributors",
    links: [
      { href: "/programs", label: "Open programs" },
      { href: "/earn/info", label: "How pay works" },
      { href: "/earn/refer", label: "Refer a friend" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/ops/login", label: "Team login" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-line pb-[calc(32px+env(safe-area-inset-bottom,0px))] pt-14">
      <div className="mx-auto w-full max-w-[1120px] px-6">
        <nav aria-label="Footer" className="grid grid-cols-2 gap-7 md:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="col-span-2 md:col-span-1">
            <Link
              href="/"
              className="flex items-center gap-2.5"
              aria-label="Twin Lanterns home"
            >
              <Mark className="h-[17px] w-auto text-ink" />
              <span className="text-[11px] tracking-[0.3em]">TWIN LANTERNS</span>
            </Link>
          </div>

          {columns.map((c) => (
            <div key={c.title} className="grid min-w-0 content-start gap-2.5 text-[13.5px] text-muted">
              <h2 className="mb-1 font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#4f555e]">
                {c.title}
              </h2>
              {c.links.map((l) =>
                l.href.startsWith("mailto:") ? (
                  <a key={l.label} href={l.href} className="transition-colors hover:text-ink">
                    {l.label}
                  </a>
                ) : (
                  <Link key={l.label} href={l.href} className="transition-colors hover:text-ink">
                    {l.label}
                  </Link>
                ),
              )}
            </div>
          ))}
        </nav>

        <div className="mt-12 flex flex-wrap justify-between gap-4 border-t border-line pt-5 font-mono text-[11px] tracking-[0.08em] text-[#4f555e]">
          <span>© {new Date().getFullYear()} TWIN LANTERNS</span>
          <span>LOS ANGELES, CA</span>
        </div>
      </div>
    </footer>
  );
}
