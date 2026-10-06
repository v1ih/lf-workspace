import { Field, FormGrid, Input, Select, Textarea } from "./ui/form";
import { TASK_CATEGORIES, TASK_PRIORITIES, TASK_STATUSES, TASK_TYPES } from "@/lib/labels";

export type Option = { id: string; name: string };

export type TaskFormValues = {
  title?: string;
  description?: string | null;
  status?: string;
  priority?: string;
  type?: string;
  category?: string;
  projectId?: string | null;
  sprintId?: string | null;
  estimate?: number | null;
  dueDate?: string | null;
  prUrl?: string | null;
};

/** Shared by the "New task" dialog and the task editor. No hooks, so it works on server and client. */
export function TaskFields({
  values = {},
  projects,
  sprints,
}: {
  values?: TaskFormValues;
  projects: Option[];
  sprints: Option[];
}) {
  return (
    <>
      <Field label="Title">
        <Input name="title" required defaultValue={values.title} placeholder="Improve Vet-Pass access validation" />
      </Field>
      <Field label="Description" hint="Acceptance criteria, links, notes">
        <Textarea name="description" rows={4} defaultValue={values.description ?? ""} />
      </Field>
      <FormGrid>
        <Field label="Project">
          <Select name="projectId" defaultValue={values.projectId ?? ""}>
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Sprint">
          <Select name="sprintId" defaultValue={values.sprintId ?? ""}>
            <option value="">No sprint</option>
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Type">
          <Select name="type" defaultValue={values.type ?? "FULL_STACK"}>
            {Object.entries(TASK_TYPES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Category" hint="Only Development counts as development productivity">
          <Select name="category" defaultValue={values.category ?? ""}>
            <option value="">Automatic (from type)</option>
            {TASK_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Priority">
          <Select name="priority" defaultValue={values.priority ?? "MEDIUM"}>
            {Object.entries(TASK_PRIORITIES).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status">
          <Select name="status" defaultValue={values.status ?? "TODO"}>
            {TASK_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Estimate (hours)">
          <Input name="estimate" type="number" step="0.5" min="0" defaultValue={values.estimate ?? ""} />
        </Field>
        <Field label="Due date">
          <Input name="dueDate" type="date" defaultValue={values.dueDate ?? ""} />
        </Field>
        <Field label="Pull request">
          <Input name="prUrl" type="url" placeholder="https://github.com/…" defaultValue={values.prUrl ?? ""} />
        </Field>
      </FormGrid>
    </>
  );
}
