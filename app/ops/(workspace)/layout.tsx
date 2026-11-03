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
import { Badge, Panel } from "../_components/ui";

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
    <div className="min-h-screen bg-white pt-14 text-ink">
      <div className="mx-auto flex max-w-[1500px] flex-col lg:flex-row">
        <aside className="border-b border-line px-5 py-6 lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:w-64 lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <p className="label">Twin Lanterns Operations</p>
          {ws && ws.projects.length > 0 && <ProjectSelect projects={ws.projects} current={ws.project?.id} />}
          {ws?.project && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone="amber">{ws.project.stage === "pilot" ? "Pilot" : ws.project.stage}</Badge>
              {ws.project.customer_alias && <Badge>{ws.project.customer_alias}</Badge>}
            </div>
          )}
          <OpsNav role={actor.role} />
          <div className="mt-6 border-t border-line pt-4 text-xs text-neutral-500">
            <p className="text-neutral-800">{actor.label}</p>
            <p className="capitalize">{actor.role}</p>
            <form action={logout} className="mt-2">
              <button type="submit" className="underline hover:text-neutral-800">
                Sign out
              </button>
            </form>
          </div>
        </aside>
        <div className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">{body}</div>
      </div>
    </div>
  );
}
