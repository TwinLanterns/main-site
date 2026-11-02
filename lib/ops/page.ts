// lib/ops/page.ts
//
// What every /ops page starts with. The layout renders load errors and the
// "no project yet" state, so pages only see a usable workspace.

import { redirect } from "next/navigation";
import { currentWorkspace } from "./request";

export async function pageData() {
  const cur = await currentWorkspace();
  if (!cur) redirect("/ops/login");
  if (!cur.result.ok || !cur.result.ws.project) return null;
  return { actor: cur.actor, ws: cur.result.ws, project: cur.result.ws.project };
}
