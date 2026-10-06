import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { entrySeconds, cn } from "@/lib/utils";
import { createTask } from "@/actions/tasks";
import { PageHeader } from "@/components/page-header";
import { FormDialog } from "@/components/ui/form-dialog";
import { TaskFields } from "@/components/task-fields";
import { Kanban, type BoardTask } from "./kanban";

export const metadata: Metadata = { title: "My Work" };

export default async function WorkPage({ searchParams }: PageProps<"/work">) {
  const user = await getCurrentUser();
  const params = await searchParams;

  const [projects, sprints] = await Promise.all([
    db.project.findMany({ where: { userId: user.id, status: { not: "ARCHIVED" } }, orderBy: { name: "asc" } }),
    db.sprint.findMany({ where: { userId: user.id }, orderBy: { startDate: "desc" } }),
  ]);

  // Default view: the active sprint
  const activeSprint = sprints.find((s) => s.status === "ACTIVE");
  const sprintFilter = typeof params.sprint === "string" ? params.sprint : (activeSprint?.id ?? "all");
  const projectFilter = typeof params.project === "string" ? params.project : undefined;

  const tasks = await db.task.findMany({
    where: {
      userId: user.id,
      ...(sprintFilter !== "all" && { sprintId: sprintFilter }),
      ...(projectFilter && { projectId: projectFilter }),
    },
    include: { project: true, timeEntries: { select: { startedAt: true, endedAt: true } } },
    orderBy: [{ position: "asc" }, { number: "asc" }],
  });

  const board: BoardTask[] = tasks.map((t) => ({
    id: t.id,
    number: t.number,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    type: t.type,
    position: t.position,
    estimate: t.estimate,
    prUrl: t.prUrl,
    dueDate: t.dueDate?.toISOString().slice(0, 10) ?? null,
    projectId: t.projectId,
    sprintId: t.sprintId,
    projectName: t.project?.name ?? null,
    projectColor: t.project?.color ?? null,
    trackedSeconds: t.timeEntries.reduce((sum, e) => sum + entrySeconds(e), 0),
    running: t.timeEntries.some((e) => e.endedAt === null),
  }));

  const projectOptions = projects.map((p) => ({ id: p.id, name: p.name }));
  const sprintOptions = sprints.map((s) => ({ id: s.id, name: s.name }));

  const filterLink = (next: { sprint?: string; project?: string | null }) => {
    const q = new URLSearchParams();
    q.set("sprint", next.sprint ?? sprintFilter);
    const project = next.project === undefined ? projectFilter : next.project;
    if (project) q.set("project", project);
    return `/work?${q.toString()}`;
  };

  return (
    <>
      <PageHeader
        title="My Work"
        subtitle="Backlog → To do → In progress → Code review → Done. Drag cards between columns."
        actions={
          <FormDialog
            title="New task"
            trigger={
              <>
                <Plus className="size-4" /> New task
              </>
            }
            action={createTask}
            submitLabel="Create task"
          >
            <TaskFields
              projects={projectOptions}
              sprints={sprintOptions}
              values={{ sprintId: sprintFilter !== "all" ? sprintFilter : activeSprint?.id, projectId: projectFilter }}
            />
          </FormDialog>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2 text-xs">
        <Chip href={filterLink({ sprint: "all" })} active={sprintFilter === "all"}>
          All sprints
        </Chip>
        {sprints.map((s) => (
          <Chip key={s.id} href={filterLink({ sprint: s.id })} active={sprintFilter === s.id}>
            {s.name}
          </Chip>
        ))}
        <span className="mx-1 w-px bg-line" />
        <Chip href={filterLink({ project: null })} active={!projectFilter}>
          All projects
        </Chip>
        {projects.map((p) => (
          <Chip key={p.id} href={filterLink({ project: p.id })} active={projectFilter === p.id}>
            {p.name}
          </Chip>
        ))}
      </div>

      <Kanban tasks={board} projects={projectOptions} sprints={sprintOptions} />
    </>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 transition-colors",
        active ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink-soft hover:border-ink/30",
      )}
    >
      {children}
    </Link>
  );
}
