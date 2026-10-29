"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Mark from "./Mark";
import { DATA_REQUEST_HREF } from "@/lib/site";

const links = [
  { href: "/#data", label: "Data" },
  { href: "/#method", label: "Method" },
  { href: "/programs", label: "Contributors" },
  { href: "/#standards", label: "Standards" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the menu on navigation by adjusting state during render rather than
  // in an effect (avoids an extra cascading render).
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  // Escape closes the mobile menu and hands focus back to its toggle.
  const toggleRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open]);

  // Hash links point into the homepage, so only plain routes can be current.
  const current = (href: string) => (!href.includes("#") && href === pathname ? "page" : undefined);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-ink/[0.04] bg-white/70 pt-[env(safe-area-inset-top,0px)] backdrop-blur-[14px] backdrop-saturate-[1.4]">
      <div className="flex items-center justify-between px-6 py-3.5">
        <Link
          href="/"
          className="flex items-center gap-2.5"
          aria-label="Twin Lanterns home"
          onClick={() => setOpen(false)}
        >
          <Mark className="h-[18px] w-auto text-ink" />
          <span className="text-[11.5px] font-normal tracking-[0.3em]">
            TWIN LANTERNS
          </span>
        </Link>

        <nav aria-label="Main" className="flex items-center gap-7 text-[13px] text-muted">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={current(l.href)}
              className="hidden transition-colors hover:text-ink md:block"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href={DATA_REQUEST_HREF}
            aria-current={current(DATA_REQUEST_HREF)}
            className="rounded-full border border-dim px-3.5 py-1.5 text-ink transition-colors hover:border-muted"
          >
            Contact Us
          </Link>
          <button
            ref={toggleRef}
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            className="-mr-1 grid h-8 w-8 place-items-center md:hidden"
          >
            <span aria-hidden="true" className="relative block h-3 w-4">
              <span
                className={`absolute left-0 block h-px w-4 bg-ink transition-all duration-300 ${open ? "top-1.5 rotate-45" : "top-0.5"}`}
              />
              <span
                className={`absolute left-0 block h-px w-4 bg-ink transition-all duration-300 ${open ? "top-1.5 -rotate-45" : "top-2.5"}`}
              />
            </span>
          </button>
        </nav>
      </div>

      {open && (
        <nav id="mobile-menu" aria-label="Mobile" className="border-t border-line px-6 pb-4 md:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              aria-current={current(l.href)}
              className="block border-b border-line py-3.5 text-[15px] text-muted transition-colors last:border-0 hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
