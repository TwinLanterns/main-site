// app/ops/(workspace)/inquiries/page.tsx
//
// Internal inbox for business inquiries from /data-request. Managed
// collection and platform-access interest are kept apart so demand for
// each can be read separately. Nothing here sends outreach.

import type { Metadata } from "next";
import Link from "next/link";
import { pageData } from "@/lib/ops/page";
import { db } from "@/lib/ops/db";
import { updateInquiry } from "../../actions";
import ActionForm from "../../_components/ActionForm";
import { Badge, Empty, Field, PageHeader, Panel, fmtDate, fmtDateTime, ghostButton, input } from "../../_components/ui";

export const metadata: Metadata = { title: "Business inquiries" };

interface Inquiry {
  id: string;
  name: string;
  email: string;
  message: string;
  organization: string | null;
  interest: string | null;
  environment: string | null;
  geography: string | null;
  timing: string | null;
  volume: string | null;
  volume_is_estimate: boolean | null;
  source_page: string | null;
  stage: string | null;
  owner: string | null;
  next_action_at: string | null;
  created_at: string;
}

const INTEREST: Record<string, string> = { managed_collection: "Managed collection", platform_access: "Platform access", both: "Both" };
const STAGES = ["new", "contacted", "scoping", "pilot", "closed_won", "closed_lost", "not_a_fit"];

export default async function InquiriesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const data = await pageData();
  if (!data) return null;
  if (data.actor.role !== "leadership") return <Empty>Business inquiries are limited to leadership.</Empty>;
  const sp = await searchParams;
  const interest = typeof sp.interest === "string" ? sp.interest : "";

  const { data: rows, error } = await db().from("data_requests").select("*").order("created_at", { ascending: false }).limit(500);
  if (error) return <Empty>Couldn&apos;t load inquiries: {error.message}</Empty>;
  const all = (rows ?? []) as Inquiry[];
  const list = all.filter((r) => !interest || (interest === "unspecified" ? !r.interest : r.interest === interest));
  const count = (k: string | null) => all.filter((r) => (k === null ? !r.interest : r.interest === k)).length;

  return (
    <div className="space-y-5">
      <PageHeader title="Business inquiries" sub="From the public contact form. Notifications go out through the existing confirmation email only. Follow-up is manual." />
      <div className="flex flex-wrap gap-2">
        {[
          ["", `All (${all.length})`],
          ["managed_collection", `Managed collection (${count("managed_collection")})`],
          ["platform_access", `Platform access (${count("platform_access")})`],
          ["both", `Both (${count("both")})`],
          ["unspecified", `Before interest field (${count(null)})`],
        ].map(([k, v]) => (
          <Link key={k} href={k ? `/ops/inquiries?interest=${k}` : "/ops/inquiries"} className={`${ghostButton} ${interest === k ? "border-amber" : ""}`}>
            {v}
          </Link>
        ))}
      </div>
      {list.length === 0 ? (
        <Empty>No inquiries.</Empty>
      ) : (
        <ul className="space-y-3">
          {list.map((r) => (
            <li key={r.id}>
              <Panel
                title={
                  <span className="flex flex-wrap items-center gap-2">
                    {r.name} {r.organization && <span className="text-neutral-500">· {r.organization}</span>}
                    {r.interest && <Badge tone="amber">{INTEREST[r.interest] ?? r.interest}</Badge>}
                    <Badge>{(r.stage ?? "new").replace("_", " ")}</Badge>
                  </span>
                }
                actions={<span className="text-xs text-neutral-500">{fmtDateTime(r.created_at)}</span>}
              >
                <p className="text-sm text-neutral-600">
                  <a href={`mailto:${r.email}`} className="underline">
                    {r.email}
                  </a>
                  {[r.environment && `Environment: ${r.environment}`, r.geography && `Geography: ${r.geography}`, r.timing && `Timing: ${r.timing}`, r.volume && `Volume: ${r.volume}${r.volume_is_estimate ? " (estimate)" : ""}`]
                    .filter(Boolean)
                    .map((x) => ` · ${x}`)}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-900">{r.message}</p>
                <ActionForm action={updateInquiry} inline className="mt-3" submit="Save" submitClassName={ghostButton}>
                  <input type="hidden" name="id" value={r.id} />
                  <Field name="Stage">
                    <select name="stage" defaultValue={r.stage ?? "new"} className={input}>
                      {STAGES.map((s) => (
                        <option key={s} value={s}>
                          {s.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field name="Owner">
                    <input name="owner" defaultValue={r.owner ?? ""} className={input} />
                  </Field>
                  <Field name={`Next action${r.next_action_at ? ` (${fmtDate(r.next_action_at)})` : ""}`}>
                    <input type="date" name="next_action_at" defaultValue={r.next_action_at ?? ""} className={input} />
                  </Field>
                </ActionForm>
              </Panel>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
