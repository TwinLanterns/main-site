"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/ops/auth";

const ITEMS: { href: string; label: string; roles?: Role[] }[] = [
  { href: "/ops", label: "Overview" },
  { href: "/ops/operators", label: "Operator CRM" },
  { href: "/ops/onboarding", label: "Onboarding" },
  { href: "/ops/sessions", label: "Recording Operations" },
  { href: "/ops/shifts", label: "Shift board", roles: ["leadership", "manager"] },
  { href: "/ops/files", label: "Files and Review" },
  { href: "/ops/issues", label: "Tasks and Issues" },
  { href: "/ops/forecast", label: "Production Forecasts" },
  { href: "/ops/import", label: "Imports", roles: ["leadership"] },
  { href: "/ops/inquiries", label: "Business inquiries", roles: ["leadership"] },
  { href: "/ops/settings", label: "Project settings" },
];

export default function OpsNav({ role }: { role: Role }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Operations" className="mt-5">
      <ul className="flex flex-wrap gap-0.5 lg:flex-col">
        {ITEMS.filter((i) => !i.roles || i.roles.includes(role)).map((i) => {
          const active = i.href === "/ops" ? pathname === "/ops" : pathname.startsWith(i.href);
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                aria-current={active ? "page" : undefined}
                className={`relative block rounded-md px-3 py-1.5 text-sm transition-colors before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full ${
                  active ? "bg-ops-raised text-ink before:bg-amber" : "text-muted before:bg-transparent hover:bg-ops-raised/60 hover:text-ink"
                }`}
              >
                {i.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
