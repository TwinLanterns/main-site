"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PROGRAMS, type Program } from "@/lib/programs";

const btn =
  "rounded-full px-7 py-4 text-[16px] transition-colors inline-flex items-center justify-center";

const LOCATIONS = ["All", "Anywhere", "Los Angeles"] as const;

function matches(p: Program, q: string) {
  if (!q) return true;
  const hay = [p.name, p.title, p.body, p.location, p.pay, p.gear, ...p.keywords]
    .join(" ")
    .toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => hay.includes(word));
}

export default function ProgramSearch() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState<(typeof LOCATIONS)[number]>("All");
  const [selectedSlug, setSelectedSlug] = useState(PROGRAMS[0].slug);

  const results = useMemo(
    () =>
      PROGRAMS.filter(
        (p) => (location === "All" || p.location === location) && matches(p, query),
      ),
    [query, location],
  );
  const selected = results.find((p) => p.slug === selectedSlug) ?? results[0];

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search programs</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search programs — try “GoPro”, “speech”, “phone”…"
            className="w-full rounded-full border border-ink/15 bg-white px-6 py-4 text-[16px] outline-none transition-colors placeholder:text-ink/40 focus:border-ink"
          />
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by location">
          {LOCATIONS.map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={location === l}
              onClick={() => setLocation(l)}
              className={`rounded-full border px-5 py-3 text-[14.5px] transition-colors ${
                location === l
                  ? "border-ink bg-ink text-white"
                  : "border-ink/15 hover:border-ink"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <p className="label mt-8 pb-3" aria-live="polite">
        {results.length} {results.length === 1 ? "program" : "programs"}
      </p>

      {results.length === 0 ? (
        <div className="rounded-[28px] border border-ink/10 p-10 text-center">
          <p className="display text-2xl">No programs match that.</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setLocation("All");
            }}
            className="mt-4 text-[15px] underline underline-offset-4"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <ul className="space-y-3">
            {results.map((p) => {
              const on = p.slug === selected?.slug;
              return (
                <li key={p.slug}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => setSelectedSlug(p.slug)}
                    className={`w-full rounded-[24px] border p-6 text-left transition-all ${
                      on
                        ? "border-ink bg-ink text-white"
                        : "border-ink/10 hover:border-ink/40"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`h-2.5 w-2.5 rounded-full ${p.dot}`} />
                      <span className="label !text-current opacity-70">{p.location}</span>
                    </div>
                    <h3 className="display mt-3 text-[1.6rem]">{p.name}</h3>
                    <p className={`mt-2 text-[15px] ${on ? "text-white/70" : "text-muted"}`}>
                      {p.title}
                    </p>
                    <p className={`mt-4 text-[13.5px] ${on ? "text-white/60" : "text-muted"}`}>
                      {p.pay} · {p.gear}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>

          {selected && (
            <article
              key={selected.slug}
              className="rounded-[28px] bg-ink p-8 text-white sm:p-10 lg:sticky lg:top-24"
            >
              <div className="flex items-center gap-2.5">
                <span className={`h-2 w-2 rounded-full ${selected.dot}`} />
                <span className="label !text-white/70">{selected.tag}</span>
              </div>
              <h2 className="display mt-6 text-[clamp(2rem,3.6vw,2.9rem)]">{selected.title}</h2>
              <p className="mt-5 max-w-[52ch] text-[16.5px] leading-relaxed text-white/70">
                {selected.body}
              </p>
              <dl className="mt-8 divide-y divide-white/10 border-y border-white/10">
                {selected.facts.map(([k, v]) => (
                  <div key={k} className="grid gap-1 py-4 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                    <dt className="display text-[1.3rem]">{k}</dt>
                    <dd className="text-[14.5px] text-white/60">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={selected.apply} className={`${btn} ${selected.primary}`}>
                  Start earning
                </Link>
                <Link
                  href={selected.more}
                  className={`${btn} border border-white/25 hover:border-white`}
                >
                  See more
                </Link>
              </div>
            </article>
          )}
        </div>
      )}
    </div>
  );
}
