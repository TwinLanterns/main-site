// lib/ops/request.ts
//
// Per-request loaders shared by the /ops layout and its pages. Wrapped in
// React cache() so the layout and page don't each query Supabase.

import { cache } from "react";
import { cookies } from "next/headers";
import { getActor } from "./auth";
import { loadWorkspace } from "./db";

/** Selected project, remembered in a cookie. Not a permission — loadWorkspace re-checks scope. */
export const OPS_PROJECT_COOKIE = "ops_project";

export const currentActor = cache(getActor);

export const currentWorkspace = cache(async () => {
  const actor = await currentActor();
  if (!actor) return null;
  const projectId = (await cookies()).get(OPS_PROJECT_COOKIE)?.value;
  return { actor, result: await loadWorkspace(actor, projectId) };
});
