"use client";

import { useActionState, useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { Clock, ExternalLink, GitPullRequest, Play, Trash2, X } from "lucide-react";
import { deleteTask, moveTask, submitForReview, updateTask } from "@/actions/tasks";
import { startTimer } from "@/actions/time";
import { TASK_CATEGORIES, TASK_PRIORITIES, TASK_STATUSES, TASK_TYPES } from "@/lib/labels";
import { cn, formatDuration, taskCode } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/form-dialog";
import { TaskFields, type Option } from "@/components/task-fields";

export type BoardTask = {
  id: string;
  number: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  type: string;
  category: string;
  position: number;
  estimate: number | null;
  prUrl: string | null;
  dueDate: string | null;
  projectId: string | null;
  sprintId: string | null;
  projectName: string | null;
  projectColor: string | null;
  trackedSeconds: number;
  running: boolean;
};

type Status = (typeof TASK_STATUSES)[number]["value"];

export function Kanban({ tasks, projects, sprints }: { tasks: BoardTask[]; projects: Option[]; sprints: Option[] }) {
  // Optimistic copy of the server data: cards move instantly, the server confirms after
  const [items, setOptimisticItems] = useOptimistic(tasks, (_, next: BoardTask[]) => next);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);
  const [selected, setSelected] = useState<BoardTask | null>(null);
  const [, startTransition] = useTransition();

  function columnTasks(status: string) {
    return items.filter((t) => t.status === status).sort((a, b) => a.position - b.position);
  }

  function handleDrop(status: Status, beforeId: string | null) {
    if (!dragId) return;
    const dragged = items.find((t) => t.id === dragId);
    if (!dragged) return;

    const column = columnTasks(status).filter((t) => t.id !== dragId);
    const index = beforeId ? column.findIndex((t) => t.id === beforeId) : column.length;
    column.splice(index < 0 ? column.length : index, 0, { ...dragged, status });
    const ordered = column.map((t, position) => ({ ...t, position }));

    const next = [...items.filter((t) => t.status !== status && t.id !== dragId), ...ordered];
    setDragId(null);
    setOverColumn(null);
    startTransition(async () => {
      setOptimisticItems(next);
      await moveTask(dragged.id, status, ordered.map((t) => t.id));
    });
  }

  return (
    <>
      <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-8 sm:px-8">
        <div className="grid min-w-[1100px] grid-cols-5 gap-4">
          {TASK_STATUSES.map((col) => {
            const list = columnTasks(col.value);
            return (
              <div
                key={col.value}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverColumn(col.value);
                }}
                onDragLeave={() => setOverColumn(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(col.value, null);
                }}
                className={cn(
                  "flex min-h-[60vh] flex-col rounded-2xl bg-sunken/70 p-2.5 transition-colors",
                  overColumn === col.value && "bg-accent-soft/70 ring-2 ring-accent/30",
                )}
              >
                <div className="mb-2 flex items-center justify-between px-1.5 py-1">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-soft">{col.label}</h3>
                  <span className="rounded-full bg-surface px-2 text-xs text-muted">{list.length}</span>
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  {list.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      dragging={dragId === task.id}
                      onDragStart={() => setDragId(task.id)}
                      onDragEnd={() => setDragId(null)}
                      onDropBefore={() => handleDrop(col.value, task.id)}
                      onOpen={() => setSelected(task)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <TaskEditor task={selected} onClose={() => setSelected(null)} projects={projects} sprints={sprints} />
    </>
  );
}

function TaskCard({
  task,
  dragging,
  onDragStart,
  onDragEnd,
  onDropBefore,
  onOpen,
}: {
  task: BoardTask;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDropBefore: () => void;
  onOpen: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const priority = TASK_PRIORITIES[task.priority];

  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDropBefore();
      }}
      onClick={onOpen}
      className={cn(
        "group cursor-grab rounded-xl border border-line bg-surface p-3 shadow-[0_1px_2px_rgb(30_26_23/0.05)] transition hover:border-accent/40 active:cursor-grabbing",
        dragging && "opacity-40",
        task.running && "border-accent/60 ring-2 ring-accent/20",
      )}
    >
      <div className="flex items-center gap-1.5 text-[11px] text-muted">
        <span className="font-mono font-semibold text-ink-soft">{taskCode(task.number)}</span>
        {task.projectName && (
          <>
            <span>·</span>
            <span className="inline-flex items-center gap-1 truncate">
              <span className="size-1.5 rounded-full" style={{ background: task.projectColor ?? undefined }} />
              {task.projectName}
            </span>
          </>
        )}
      </div>
      <p className={cn("mt-1.5 text-sm font-medium leading-snug", task.status === "DONE" && "text-muted line-through decoration-line")}>
        {task.title}
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-1">
        <Badge>{TASK_TYPES[task.type]}</Badge>
        {task.category !== "DEVELOPMENT" && task.category !== task.type && (
          <Badge tone={TASK_CATEGORIES.find((c) => c.value === task.category)?.tone}>
            {TASK_CATEGORIES.find((c) => c.value === task.category)?.label}
          </Badge>
        )}
        {(task.priority === "HIGH" || task.priority === "URGENT") && <Badge tone={priority.tone}>{priority.label}</Badge>}
      </div>
      <div className="mt-2.5 flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-[11px] text-muted">
          <Clock className="size-3" />
          {formatDuration(task.trackedSeconds)}
          {task.estimate ? ` / ${task.estimate}h` : ""}
        </span>
        {task.status !== "DONE" && !task.running && (
          <button
            type="button"
            disabled={pending}
            onClick={(e) => {
              e.stopPropagation();
              startTransition(() => startTimer(task.id));
            }}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-accent opacity-0 transition hover:bg-accent-soft group-hover:opacity-100 focus:opacity-100"
          >
            <Play className="size-3" /> Start
          </button>
        )}
        {task.running && <span className="text-[11px] font-semibold text-accent">● Working</span>}
      </div>
    </article>
  );
}

function TaskEditor({
  task,
  onClose,
  projects,
  sprints,
}: {
  task: BoardTask | null;
  onClose: () => void;
  projects: Option[];
  sprints: Option[];
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action] = useActionState(updateTask, undefined);
  const [reviewState, reviewAction] = useActionState(submitForReview, undefined);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (task) ref.current?.showModal();
    else ref.current?.close();
  }, [task]);

  useEffect(() => {
    if (state?.ok || reviewState?.ok) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, reviewState]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-[min(640px,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl"
    >
      {task && (
        <div className="flex max-h-[88vh] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
            <div>
              <p className="font-mono text-xs font-semibold text-accent">{taskCode(task.number)}</p>
              <h2 className="mt-0.5 text-base font-semibold">{task.title}</h2>
              <p className="mt-1 text-xs text-muted">Tracked {formatDuration(task.trackedSeconds)}</p>
            </div>
            <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>

          <div className="overflow-y-auto">
            {(task.status === "IN_PROGRESS" || task.status === "TODO") && (
              <form action={reviewAction} className="border-b border-line bg-sunken/50 px-6 py-4">
                <input type="hidden" name="id" value={task.id} />
                <div className="flex flex-wrap items-end gap-3">
                  <Field label="Finished? Submit for review" className="min-w-60 flex-1">
                    <Input name="prUrl" type="url" placeholder="Pull request link (optional)" defaultValue={task.prUrl ?? ""} />
                  </Field>
                  <SubmitButton variant="dark">
                    <GitPullRequest className="size-4" /> Submit for review
                  </SubmitButton>
                </div>
                {reviewState?.error && <p className="mt-2 text-xs text-red-700">{reviewState.error}</p>}
              </form>
            )}

            <form id="task-form" action={action} className="space-y-4 px-6 py-5">
              <input type="hidden" name="id" value={task.id} />
              <TaskFields
                key={task.id}
                projects={projects}
                sprints={sprints}
                values={{ ...task, dueDate: task.dueDate }}
              />
            </form>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-line px-6 py-4">
            <Button
              variant="danger"
              size="sm"
              disabled={pending}
              onClick={() => {
                if (!confirm(`Delete ${taskCode(task.number)}?`)) return;
                startTransition(async () => {
                  await deleteTask(task.id);
                  onClose();
                });
              }}
            >
              <Trash2 className="size-3.5" /> Delete
            </Button>
            {task.prUrl && (
              <a href={task.prUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
                <ExternalLink className="size-3" /> Open PR
              </a>
            )}
            {state?.error && <p className="text-xs text-red-700">{state.error}</p>}
            <div className="ml-auto flex gap-2">
              {task.status !== "DONE" && !task.running && (
                <Button
                  variant="secondary"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await startTimer(task.id);
                      onClose();
                    })
                  }
                >
                  <Play className="size-4" /> Start working
                </Button>
              )}
              <SubmitButton form="task-form">Save changes</SubmitButton>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}
