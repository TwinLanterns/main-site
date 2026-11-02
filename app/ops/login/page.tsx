import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getActor } from "@/lib/ops/auth";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Team sign in",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default async function OpsLoginPage({ searchParams }: { searchParams: Promise<{ from?: string | string[] }> }) {
  if (await getActor()) redirect("/ops");
  const { from } = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 pt-14">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-amber">Twin Lanterns Operations</p>
        <h1 className="mt-2 text-xl font-light text-neutral-900">Team sign in</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Accounts are created by leadership in Project settings. The shared admin login at{" "}
          <a className="underline" href="/admin/login">
            /admin
          </a>{" "}
          also opens this workspace.
        </p>
        <LoginForm from={typeof from === "string" ? from : ""} />
      </div>
    </div>
  );
}
