// lib/ops/auth.ts
//
// Who is calling /ops, and what they may touch. Every page and server
// action in app/ops calls requireActor() — proxy.ts only checks that *some*
// valid cookie is present, which is not authorization.
//
//   leadership  everything, incl. team accounts, imports, inquiries
//   manager     assigned projects (incl. operator contact details)
//   reviewer    assigned projects' sessions/files; no contact details
//
// The shared ADMIN_USERNAME login is treated as leadership and labelled
// "Shared admin login" in the audit log, since it can't name a person.

import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/admin-auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { OPS_COOKIE_NAME, verifyTeamToken } from "./team-token";

export type Role = "leadership" | "manager" | "reviewer";

export interface Actor {
  id: string | null;
  label: string;
  role: Role;
}

export class OpsAuthError extends Error {}

export async function getActor(): Promise<Actor | null> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return null;
  const jar = await cookies();

  const memberId = await verifyTeamToken(jar.get(OPS_COOKIE_NAME)?.value, secret);
  if (memberId) {
    const { data, error } = await getSupabaseServerClient()
      .from("team_members")
      .select("id, name, role, active")
      .eq("id", memberId)
      .maybeSingle<{ id: string; name: string; role: Role; active: boolean }>();
    if (error) console.error("team_members lookup failed", error);
    if (data?.active) return { id: data.id, label: data.name, role: data.role };
  }

  if (await verifySessionToken(jar.get(ADMIN_COOKIE_NAME)?.value, secret)) {
    return { id: null, label: "Shared admin login", role: "leadership" };
  }
  return null;
}

export async function requireActor(roles?: Role[]): Promise<Actor> {
  const actor = await getActor();
  if (!actor) throw new OpsAuthError("Not signed in.");
  if (roles && !roles.includes(actor.role)) throw new OpsAuthError("Your role can't do that.");
  return actor;
}

/** Project ids the actor may see; null means all (leadership). */
export async function projectScope(actor: Actor): Promise<string[] | null> {
  if (actor.role === "leadership") return null;
  const supabase = getSupabaseServerClient();
  const [assigned, managed] = await Promise.all([
    supabase.from("ops_project_assignments").select("project_id").eq("team_member_id", actor.id!),
    supabase.from("ops_projects").select("id").eq("manager_id", actor.id!),
  ]);
  if (assigned.error || managed.error) throw new Error((assigned.error ?? managed.error)!.message);
  return [
    ...new Set([
      ...(assigned.data ?? []).map((r) => r.project_id as string),
      ...(managed.data ?? []).map((r) => r.id as string),
    ]),
  ];
}

export async function requireProject(actor: Actor, projectId: string) {
  const scope = await projectScope(actor);
  if (scope && !scope.includes(projectId)) throw new OpsAuthError("You're not assigned to that project.");
}

export function canSeeContacts(actor: Actor) {
  return actor.role !== "reviewer";
}
