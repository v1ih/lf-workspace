import type { Metadata } from "next";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { formatShortDate, localDateKey } from "@/lib/dates";
import { EVIDENCE_SIZES, skillBar, skillLevel } from "@/lib/skills";
import { addEvidence, addSkill, deleteEvidence } from "@/actions/career";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { FormDialog } from "@/components/ui/form-dialog";
import { Field, FormGrid, Input, Select } from "@/components/ui/form";

export const metadata: Metadata = { title: "Learning" };

export default async function LearningPage() {
  const user = await getCurrentUser();
  const skills = await db.skill.findMany({
    where: { userId: user.id },
    include: { evidences: { orderBy: { date: "desc" } } },
    orderBy: { position: "asc" },
  });
  const recent = skills
    .flatMap((s) => s.evidences.map((e) => ({ ...e, skill: s.name })))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 15);

  return (
    <>
      <PageHeader
        title="Skill Matrix"
        subtitle="Skills grow with evidence, not with hours of courses. Shipped auth? Backend ↑. Wrote tests? Testing ↑."
        actions={
          <>
            <FormDialog
              title="Add skill"
              trigger="Add skill"
              triggerProps={{ variant: "secondary" }}
              action={addSkill}
            >
              <Field label="Skill name">
                <Input name="name" required placeholder="Cloud, Mobile, System Design…" />
              </Field>
            </FormDialog>
            <FormDialog
              title="Register evidence"
              description="Something real you built, shipped or proved."
              trigger={
                <>
                  <Plus className="size-4" /> Add evidence
                </>
              }
              action={addEvidence}
            >
              <FormGrid>
                <Field label="Skill">
                  <Select name="skillId" required>
                    {skills.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Size">
                  <Select name="points" defaultValue="10">
                    {EVIDENCE_SIZES.map((size) => (
                      <option key={size.points} value={size.points}>
                        {size.label} (+{size.points}) — {size.hint}
                      </option>
                    ))}
                  </Select>
                </Field>
              </FormGrid>
              <Field label="What did you do?">
                <Input name="title" required placeholder="Implemented JWT authentication in LF Workspace" />
              </Field>
              <FormGrid>
                <Field label="Proof (PR, commit, deploy)">
                  <Input name="url" type="url" placeholder="https://github.com/…" />
                </Field>
                <Field label="Date">
                  <Input name="date" type="date" defaultValue={localDateKey()} />
                </Field>
              </FormGrid>
            </FormDialog>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Skills" subtitle="Practiced +5 · Shipped +10 · Owned end-to-end +20" />
          <ul className="space-y-4">
            {skills.map((s) => {
              const level = skillLevel(s.evidences);
              return (
                <li key={s.id}>
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="font-medium">{s.name}</span>
                    <span className="text-xs text-muted">
                      {s.evidences.length} evidence{s.evidences.length === 1 ? "" : "s"} · {level}%
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-lg leading-none tracking-[0.12em] text-accent" aria-label={`${level}%`}>
                    {skillBar(level, 20)}
                  </p>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Evidence log" />
          {recent.length === 0 ? (
            <p className="text-sm text-muted">
              No evidence yet. Finish a ticket, then register what it proves.
            </p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {recent.map((e) => (
                <li key={e.id} className="flex items-start gap-3 py-2.5">
                  <span className="mt-0.5 rounded bg-accent-soft px-1.5 text-[11px] font-semibold text-accent-strong">+{e.points}</span>
                  <div className="min-w-0 flex-1">
                    <p className="leading-snug">{e.title}</p>
                    <p className="text-xs text-muted">
                      {e.skill} · {formatShortDate(e.date, { utc: true })}
                      {e.url && (
                        <a href={e.url} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center gap-0.5 text-accent hover:underline">
                          <ExternalLink className="size-3" /> proof
                        </a>
                      )}
                    </p>
                  </div>
                  <form action={deleteEvidence.bind(null, e.id)}>
                    <button className="rounded p-1 text-muted hover:text-red-700" aria-label="Delete evidence">
                      <Trash2 className="size-3.5" />
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
