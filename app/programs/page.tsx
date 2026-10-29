import type { Metadata } from "next";
import ProgramSearch from "@/components/ProgramSearch";

export const metadata: Metadata = {
  title: "All programs",
  description:
    "Get paid $10/hr to film everyday work or tidy your own home, or join the speech program. No résumé, no interview — sign up in two minutes.",
  alternates: { canonical: "/programs" },
};

export default function ProgramsPage() {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 pb-20 pt-16 sm:pt-24">
      <p className="label">Open programs</p>
      <h1 className="display mt-4 max-w-[16ch] text-[clamp(2.4rem,5.4vw,4.2rem)]">
        Find a program that fits.
      </h1>
      <p className="mt-5 max-w-[54ch] text-[17px] leading-relaxed text-muted">
        Get paid to film everyday work or tidy your own home. No résumé, no
        interview, gear supplied where you need it. Pick one and sign up in
        two minutes.
      </p>
      <div className="mt-10">
        <ProgramSearch />
      </div>
    </div>
  );
}
