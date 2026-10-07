import Link from "next/link";

const columns = [
  {
    title: "Students",
    links: [
      { href: "/apply", label: "Apply" },
      { href: "/#roles", label: "Role types" },
      { href: "/#faq", label: "FAQ" },
    ],
  },
  {
    title: "Companies",
    links: [
      { href: "/companies", label: "Scope a role" },
      { href: "/#how", label: "How it works" },
      { href: "/#two-sides", label: "What you get" },
    ],
  },
  {
    title: "Company",
    links: [
      //{ href: "/#team", label: "Team" },
      { href: "mailto:hello@twinlanterns.co", label: "hello@twinlanterns.co" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="overflow-hidden border-t border-line">
      <div className="mx-auto w-full max-w-[1240px] px-5 pt-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.6fr))]">
          <div>
            <p className="max-w-xs text-[15px] leading-relaxed text-muted">
              The bridge between ambitious high school and college students and
              the companies that need them. Built in Los Angeles.
            </p>
            <Link
              href="/apply"
              className="mt-6 inline-flex rounded-full bg-ink px-5 py-3 text-[14px] text-white transition-colors hover:bg-flame"
            >
              Apply as a student
            </Link>
          </div>

          {columns.map((c) => (
            <div key={c.title}>
              <p className="label">{c.title}</p>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-[14.5px] text-muted transition-colors hover:text-ink"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-line py-6 text-[13px] text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} Twin Lanterns. All rights reserved.
          </p>
          <nav
            aria-label="Legal"
            className="flex flex-wrap items-center gap-x-5 gap-y-1"
          >
            <Link href="/privacy" className="transition-colors hover:text-ink">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-ink">
              Terms
            </Link>
            <span>Los Angeles, California</span>
          </nav>
        </div>
      </div>

      <p
        aria-hidden="true"
        className="display select-none whitespace-nowrap text-center text-[13.3vw] leading-[0.82] tracking-[-0.05em]"
      >
        Twin Lanterns
      </p>
    </footer>
  );
}
