import { CLIENT_STATUSES } from "@/lib/labels";
import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui/form";

type ClientValues = {
  id?: string;
  name?: string;
  segment?: string | null;
  status?: string;
  country?: string;
  hourlyRate?: unknown;
  notes?: string | null;
};

export function ClientFields({ values = {} }: { values?: ClientValues }) {
  return (
    <>
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <FormGrid>
        <Field label="Name">
          <Input name="name" required defaultValue={values.name} />
        </Field>
        <Field label="Segment">
          <Input name="segment" placeholder="E-commerce, clinic…" defaultValue={values.segment ?? ""} />
        </Field>
        <Field label="Status">
          <Select name="status" defaultValue={values.status ?? "ACTIVE"}>
            {Object.entries(CLIENT_STATUSES).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Country">
          <Input name="country" defaultValue={values.country ?? "Brazil"} />
        </Field>
        <Field label="Hourly rate (R$)" hint="Optional — used to compare with your effective rate">
          <Input name="hourlyRate" type="number" step="0.01" min="0" defaultValue={values.hourlyRate ? String(values.hourlyRate) : ""} />
        </Field>
      </FormGrid>
      <Field label="Notes">
        <Textarea name="notes" rows={4} defaultValue={values.notes ?? ""} />
      </Field>
    </>
  );
}
