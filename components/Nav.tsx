"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Mark from "./Mark";

const links = [
  { href: "/#how", label: "How it works" },
  { href: "/#roles", label: "Roles" },
  //{ href: "/#team", label: "Team" },
  { href: "/#faq", label: "FAQ" },
];

const earnLinks = [
  { href: "/partner/info", label: "Filming info" },
  { href: "/partner/gopro", label: "GoPro home program" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [small, setSmall] = useState(false);
  const [earnOpen, setEarnOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
    setEarnOpen(false);
  }, [pathname]);

  // touch devices can't hover, so the earn menu opens on tap instead;
  // any tap outside it closes it again
  useEffect(() => {
    if (!earnOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!(e.target as Element).closest("[data-earn-menu]")) setEarnOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [earnOpen]);

  useEffect(() => {
    const onScroll = () => setSmall(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const cta = (compact: boolean) => (
    <>
      <Link
        href="/companies"
        className={`hidden rounded-full border border-ink/15 bg-white text-[15px] transition-all duration-500 hover:border-ink sm:block ${
          compact ? "px-4 py-2" : "px-5 py-2.5"
        }`}
      >
        I&apos;m hiring
      </Link>
      <Link
        href="/apply"
        className={`hidden rounded-full border border-ink/15 bg-white text-[15px] transition-all duration-500 hover:border-ink sm:block ${
          compact ? "px-4 py-2" : "px-5 py-2.5"
        }`}
      >
        Apply
      </Link>
      <div data-earn-menu className="group relative">
        <Link
          href="/partner/info"
          aria-haspopup="true"
          aria-expanded={earnOpen}
          onClick={(e) => {
            if (!window.matchMedia("(hover: none)").matches) return;
            e.preventDefault();
            setEarnOpen((v) => !v);
          }}
          className={`block rounded-full text-[15px] text-white transition-all duration-500 group-hover:bg-flame ${
            earnOpen ? "bg-flame" : "bg-ink"
          } ${compact ? "px-4 py-2" : "px-5 py-2.5"}`}
        >
          Earn Now
        </Link>
        {/* pt-2 bridges the gap so the menu stays open while the cursor moves down */}
        <div
          className={`absolute right-0 top-full z-10 pt-2 transition-all duration-200 group-hover:visible group-hover:opacity-100 group-has-[:focus-visible]:visible group-has-[:focus-visible]:opacity-100 ${
            earnOpen ? "visible opacity-100" : "invisible opacity-0"
          }`}
        >
          <div className="w-max overflow-hidden rounded-[20px] border border-line bg-white p-1.5 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.45)]">
            {earnLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setEarnOpen(false)}
                className="block rounded-full px-4 py-2 text-[14.5px] text-muted transition-colors hover:bg-shell hover:text-ink"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-4 pt-4">
      <div className="relative mx-auto max-w-[1180px]">
        {/* centre pill — collapses to a minimal capsule on scroll */}
        <div
          className={`pointer-events-auto mx-auto flex w-max items-center rounded-full border border-line bg-white transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            small
              ? "gap-1 px-2 py-1.5 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.45)]"
              : "w-full gap-6 px-5 py-3"
          }`}
        >
          <Link
            href="/"
            className={`flex shrink-0 items-center transition-all duration-500 ${small ? "gap-0 pl-1.5 pr-1" : "gap-2.5"}`}
            aria-label="Twin Lanterns home"
          >
            <Mark className="h-5 w-auto text-ink" />
            <span
              className={`overflow-hidden whitespace-nowrap font-medium tracking-[-0.02em] transition-all duration-500 ${
                small
                  ? "max-w-0 text-[0px] opacity-0"
                  : "max-w-[180px] text-[17px] opacity-100"
              }`}
            >
              Twin Lanterns
            </span>
          </Link>

          <nav className="mx-auto hidden items-center gap-0.5 md:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-full text-muted transition-all duration-500 hover:bg-shell hover:text-ink ${
                  small
                    ? "px-3 py-1.5 text-[13.5px]"
                    : "px-3.5 py-2 text-[14.5px]"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* buttons live inside the bar only at the top of the page */}
          <div
            className={`flex shrink-0 items-center gap-2 transition-all duration-300 ${
              small
                ? "pointer-events-none w-0 -translate-y-1 overflow-hidden opacity-0"
                : "ml-auto opacity-100 md:ml-0"
            }`}
          >
            {cta(false)}
          </div>

          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={open}
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line md:hidden ${small ? "hidden" : ""}`}
          >
            <span className="relative block h-3 w-4">
              <span
                className={`absolute left-0 block h-px w-4 bg-ink transition-all duration-300 ${open ? "top-1.5 rotate-45" : "top-0.5"}`}
              />
              <span
                className={`absolute left-0 block h-px w-4 bg-ink transition-all duration-300 ${open ? "top-1.5 -rotate-45" : "top-2.5"}`}
              />
            </span>
          </button>
        </div>

        {/* sticky corner actions once the bar has collapsed */}
        <div
          className={`absolute right-0 top-0 flex items-center gap-2 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            small
              ? "pointer-events-auto translate-y-0 opacity-100"
              : "pointer-events-none -translate-y-2 opacity-0"
          }`}
        >
          {cta(true)}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={open}
            className="grid h-9 w-9 place-items-center rounded-full border border-line bg-white md:hidden"
          >
            <span className="relative block h-3 w-4">
              <span
                className={`absolute left-0 block h-px w-4 bg-ink transition-all duration-300 ${open ? "top-1.5 rotate-45" : "top-0.5"}`}
              />
              <span
                className={`absolute left-0 block h-px w-4 bg-ink transition-all duration-300 ${open ? "top-1.5 -rotate-45" : "top-2.5"}`}
              />
            </span>
          </button>
        </div>

        {open && (
          <div className="pointer-events-auto mt-2 overflow-hidden rounded-[28px] border border-line bg-white md:hidden">
            {[
              ...links.map((l) => ({ ...l, pop: false })),
              { href: "/partner/info", label: "Earn Now", pop: true },
              { href: "/partner/gopro", label: "GoPro home program", pop: false },
              { href: "/companies", label: "I'm hiring", pop: false },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`block border-b border-line px-5 py-4 text-[16px] last:border-0 ${
                  l.pop ? "bg-lime font-semibold text-ink" : ""
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
