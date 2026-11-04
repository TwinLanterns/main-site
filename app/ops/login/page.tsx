import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getActor } from "@/lib/ops/auth";
import { GOOGLE_ERRORS, googleConfig } from "@/lib/ops/google-sso";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Team sign in",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default async function OpsLoginPage({ searchParams }: { searchParams: Promise<{ from?: string | string[]; error?: string | string[] }> }) {
  if (await getActor()) redirect("/ops");
  const { from, error } = await searchParams;
  return (
    <div className="px-4 pb-24 pt-32 sm:pt-36">
      <div className="mx-auto max-w-[460px]">
        <p className="label">Twin Lanterns Operations</p>
        <h1 className="display mt-4 text-5xl leading-[1.02]">Team sign in.</h1>
        <p className="mt-6 text-[15px] leading-relaxed text-muted">
          Accounts are created by leadership in Project settings. The shared admin login at{" "}
          <a className="text-ink underline underline-offset-4" href="/admin/login">
            /admin
          </a>{" "}
          also opens this workspace.
        </p>
        <div className="mt-10 rounded-[28px] border border-line p-6 sm:p-8">
          <LoginForm
            from={typeof from === "string" ? from : ""}
            google={googleConfig() !== null}
            notice={typeof error === "string" ? GOOGLE_ERRORS[error] : undefined}
          />
        </div>
      </div>
    </div>
  );
}
