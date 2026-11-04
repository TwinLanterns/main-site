// app/ops/(workspace)/layout.tsx
//
// Shell for every signed-in /ops page: left navigation, project selector,
// who's signed in. Renders the setup / no-project states itself so pages
// only ever see a loaded workspace (lib/ops/page.ts).

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { currentWorkspace } from "@/lib/ops/request";
import { logout } from "../actions";
import OpsNav from "../_components/OpsNav";
import NewProjectForm from "../_components/NewProjectForm";
import ProjectSelect from "../_components/ProjectSelect";
import Link from "next/link";
import { Panel } from "../_components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { default: "Operations", template: "%s · Operations" },
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default async function OpsLayout({ children }: { children: ReactNode }) {
  const cur = await currentWorkspace();
  if (!cur) redirect("/ops/login");
  const { actor, result } = cur;

  let body: ReactNode = children;
  if (!result.ok) {
    body = (
      <Panel title={result.setupNeeded ? "Database setup needed" : "Couldn't load operations data"}>
        <p className="text-sm text-neutral-700">
          {result.setupNeeded ? (
            <>
              The operations tables don&apos;t exist yet. Run <code className="font-mono">supabase/ops_core.sql</code> once in the Supabase SQL editor, then reload.
            </>
          ) : (
            result.error
          )}
        </p>
      </Panel>
    );
  } else if (!result.ws.project) {
    body =
      actor.role === "leadership" ? (
        <Panel title="Create the first project">
          <p className="mb-4 text-sm text-neutral-600">
            Everything in Operations belongs to a project. Start with the current household collection pilot, using an approved customer alias rather than the customer&apos;s legal name.
          </p>
          <NewProjectForm team={result.ws.team} />
        </Panel>
      ) : (
        <Panel title="No projects assigned">
          <p className="text-sm text-neutral-600">Ask leadership to assign you to a project.</p>
        </Panel>
      );
  }

  const ws = result.ok ? result.ws : null;
  return (
    <div className="min-h-screen bg-ops-ground pt-14 text-ink">
      <div className="mx-auto flex max-w-[1500px] flex-col lg:flex-row">
        <aside className="flex flex-col border-b border-ops-line px-4 py-5 font-normal lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:w-60 lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <Link href="/ops" className="px-2 text-sm font-semibold text-ink">
            Operations Dashboard
          </Link>
          {ws && ws.projects.length > 0 && <ProjectSelect projects={ws.projects} current={ws.project?.id} />}
          {ws?.project && (
            <p className="mt-2 flex items-center gap-1.5 px-2 text-xs text-muted">
              <span aria-hidden className="size-1.5 rounded-full bg-amber" />
              <span className="capitalize">{ws.project.stage}</span>
            </p>
          )}
          <OpsNav role={actor.role} />
          <details className="group relative mt-6 border-t border-ops-line pt-3 lg:mt-auto">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-ops-raised [&::-webkit-details-marker]:hidden">
              <span className="min-w-0">
                <span className="block truncate text-sm text-ink">{actor.label}</span>
                <span className="block text-xs capitalize text-muted">{actor.role === "manager" ? "Project manager" : actor.role}</span>
              </span>
              <svg aria-hidden viewBox="0 0 12 12" className="size-3 shrink-0 text-muted transition-transform group-open:rotate-180">
                <path d="M3 7.5 6 4.5l3 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </summary>
            <div className="absolute bottom-full left-0 right-0 mb-1 rounded-md border border-ops-line bg-ops-raised p-1 shadow-lg">
              <form action={logout}>
                <button type="submit" className="w-full rounded px-2.5 py-1.5 text-left text-sm text-neutral-700 hover:bg-ops-ground hover:text-ink">
                  Sign out
                </button>
              </form>
            </div>
          </details>
        </aside>
        <div className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">{body}</div>
      </div>
    </div>
  );
}

