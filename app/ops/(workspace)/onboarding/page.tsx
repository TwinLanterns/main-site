// app/ops/(workspace)/onboarding/page.tsx

import type { Metadata } from "next";
import Link from "next/link";
import { pageData } from "@/lib/ops/page";
import { crmTab } from "@/lib/ops/derive";
import { HOUSEHOLD_GUIDE_TEMPLATE, onboardingProgress } from "@/lib/ops/onboarding";
import { LEAD_STAGES, isKey } from "@/lib/ops/stages";
import { installGuideTemplate } from "../../actions";
import ActionForm from "../../_components/ActionForm";
import { Badge, Empty, PageHeader, Panel, Table, fmtDateTime, td } from "../../_components/ui";

export const metadata: Metadata = { title: "Onboarding" };

export default async function OnboardingPage() {
  const data = await pageData();
  if (!data) return null;
  const { ws, project, actor } = data;
  const tpl = ws.templates.find((t) => t.active) ?? null;
  const people = ws.enrollments.filter((e) => {
    const tab = crmTab(e);
    return tab === "onboarding" || (tab === "current" && !e.readiness_confirmed_at);
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Onboarding" sub="Reusable training happens once per operator. Session checks (QR, mounting, framing) are recorded on every recording session." />

      {!tpl ? (
        <Panel title="No onboarding template installed">
          <p className="mb-3 text-sm text-neutral-600">
            Install the starting template mapped from the household Onboarding Video Guide. It lists general step labels. Review them against the PDF before relying on them, and record completion per operator with evidence.
          </p>
          <TemplateSteps steps={HOUSEHOLD_GUIDE_TEMPLATE.steps} clarifications={HOUSEHOLD_GUIDE_TEMPLATE.clarifications} />
          {actor.role !== "reviewer" && (
            <ActionForm action={installGuideTemplate} className="mt-4" submit={`Install ${HOUSEHOLD_GUIDE_TEMPLATE.version} for ${project.code}`}>
              <input type="hidden" name="project_id" value={project.id} />
            </ActionForm>
          )}
        </Panel>
      ) : (
        <Panel title={`${tpl.name} · ${tpl.version}`}>
          <p className="mb-3 text-xs text-neutral-500">Source: {tpl.source_reference}</p>
          <TemplateSteps steps={tpl.steps} clarifications={tpl.version === HOUSEHOLD_GUIDE_TEMPLATE.version ? HOUSEHOLD_GUIDE_TEMPLATE.clarifications : []} />
        </Panel>
      )}

      <Panel title={`Operators onboarding (${people.length})`}>
        {people.length === 0 ? (
          <Empty>Nobody is in onboarding. Move a qualified lead to “Ready for onboarding” in the Operator CRM.</Empty>
        ) : (
          <Table head={["Code", "Stage", "Progress", "Outstanding", "Blocked", "Onboarding owner", "Readiness"]}>
            {people.map((e) => {
              const p = tpl ? onboardingProgress(tpl.steps, ws.steps.filter((s) => s.enrollment_id === e.id && s.template_id === tpl.id)) : null;
              return (
                <tr key={e.id}>
                  <td className={td}>
                    <Link href={`/ops/operators/${e.id}`} className="font-mono underline-offset-2 hover:underline">
                      {e.anonymous_code}
                    </Link>
                  </td>
                  <td className={td}>{isKey(LEAD_STAGES, e.lead_stage) ? LEAD_STAGES[e.lead_stage] : e.lead_stage}</td>
                  <td className={td}>{p ? `${p.completed} / ${p.applicable}` : "—"}</td>
                  <td className={`${td} max-w-sm whitespace-normal text-xs text-neutral-600`}>{p?.outstanding.map((s) => s.label).join(" · ") || "—"}</td>
                  <td className={td}>
                    {p?.blocked.length ? (
                      <span className="space-y-1">
                        {p.blocked.map((b) => (
                          <Badge key={b.key} tone="bad" title={b.reason}>
                            {b.label}
                          </Badge>
                        ))}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={td}>{e.onboarding_owner || "—"}</td>
                  <td className={td}>{e.readiness_confirmed_at ? `Confirmed ${fmtDateTime(e.readiness_confirmed_at)}` : <Badge>Not confirmed</Badge>}</td>
                </tr>
              );
            })}
          </Table>
        )}
      </Panel>
    </div>
  );
}

function TemplateSteps({ steps, clarifications }: { steps: typeof HOUSEHOLD_GUIDE_TEMPLATE.steps; clarifications: string[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {(["onboarding", "session"] as const).map((scope) => (
        <div key={scope}>
          <h3 className="mb-2 label">{scope === "onboarding" ? "Once per operator" : "Before every session"}</h3>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-neutral-800">
            {steps
              .filter((s) => s.scope === scope)
              .map((s) => (
                <li key={s.key}>
                  {s.label} {!s.required && <span className="text-xs text-neutral-500">(optional)</span>}
                </li>
              ))}
          </ol>
        </div>
      ))}
      {clarifications.length > 0 && (
        <div>
          <h3 className="mb-2 label text-amber!">Needs clarification (not enforced)</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-700">
            {clarifications.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
