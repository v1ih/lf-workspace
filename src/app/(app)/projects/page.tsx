import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Pencil, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { PROJECT_STATUSES } from "@/lib/labels";
import { entrySeconds, formatDuration, percent } from "@/lib/utils";
import { saveProject } from "@/actions/business";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FormDialog } from "@/components/ui/form-dialog";
import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui/form";
import { Empty } from "@/components/ui/empty";

export const metadata: Metadata = { title: "Projects" };

type ProjectValues = {
  id?: string;
  name?: string;
  description?: string | null;
  status?: string;
  clientId?: string | null;
  repoUrl?: string | null;
  color?: string;
};

function ProjectFields({ values = {}, clients }: { values?: ProjectValues; clients: { id: string; name: string }[] }) {
  return (
    <>
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <Field label="Name">
        <Input name="name" required defaultValue={values.name} />
      </Field>
      <Field label="Description">
        <Textarea name="description" rows={2} defaultValue={values.description ?? ""} />
      </Field>
      <FormGrid>
        <Field label="Client">
          <Select name="clientId" defaultValue={values.clientId ?? ""}>
            <option value="">Internal</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status">
          <Select name="status" defaultValue={values.status ?? "ACTIVE"}>
            {Object.entries(PROJECT_STATUSES).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Repository">
          <Input name="repoUrl" type="url" placeholder="https://github.com/…" defaultValue={values.repoUrl ?? ""} />
        </Field>
        <Field label="Color">
          <Input name="color" type="color" className="h-9 p-1" defaultValue={values.color ?? "#C0613D"} />
        </Field>
      </FormGrid>
    </>
  );
}

export default async function ProjectsPage() {
  const user = await getCurrentUser();
  const [projects, clients] = await Promise.all([
    db.project.findMany({
      where: { userId: user.id },
      include: {
        client: true,
        tasks: { select: { status: true } },
        timeEntries: { select: { startedAt: true, endedAt: true } },
      },
      orderBy: [{ status: "asc" }, { name: "asc" }],
    }),
    db.client.findMany({ where: { userId: user.id }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle="Client work and internal products. Every task and hour belongs to a project."
        actions={
          <FormDialog
            title="New project"
            trigger={
              <>
                <Plus className="size-4" /> New project
              </>
            }
            action={saveProject}
          >
            <ProjectFields clients={clients} />
          </FormDialog>
        }
      />

      {projects.length === 0 && <Empty title="No projects yet" />}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((p) => {
          const done = p.tasks.filter((t) => t.status === "DONE").length;
          const open = p.tasks.length - done;
          const seconds = p.timeEntries.reduce((s, e) => s + entrySeconds(e), 0);
          const status = PROJECT_STATUSES[p.status];
          return (
            <Card key={p.id} className="flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="size-3 rounded-full" style={{ background: p.color }} />
                  <h2 className="font-semibold">{p.name}</h2>
                </div>
                <FormDialog
                  title={`Edit ${p.name}`}
                  trigger={<Pencil className="size-3.5" />}
                  triggerProps={{ variant: "ghost", size: "icon", "aria-label": "Edit project" }}
                  action={saveProject}
                >
                  <ProjectFields values={p} clients={clients} />
                </FormDialog>
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                <Badge tone={status.tone}>{status.label}</Badge>
                {p.client ? (
                  <Link href={`/clients/${p.client.id}`} className="hover:text-accent">
                    {p.client.name}
                  </Link>
                ) : (
                  "Internal"
                )}
              </div>
              {p.description && <p className="mt-3 text-sm text-ink-soft">{p.description}</p>}
              <div className="mt-auto pt-5">
                <div className="mb-1.5 flex justify-between text-xs text-muted">
                  <span>
                    {done} done · {open} open
                  </span>
                  <span>{formatDuration(seconds)} tracked</span>
                </div>
                <Progress value={percent(done, p.tasks.length)} />
                <div className="mt-3 flex gap-3 text-xs">
                  <Link href={`/work?sprint=all&project=${p.id}`} className="text-accent hover:underline">
                    Tasks →
                  </Link>
                  {p.repoUrl && (
                    <a href={p.repoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-ink-soft hover:text-accent">
                      <ExternalLink className="size-3" /> Repo
                    </a>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
