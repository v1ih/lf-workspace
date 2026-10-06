import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/dal";
import { monthKey } from "@/lib/dates";
import { AREAS, METRICS } from "@/lib/goals";
import { getGoalTargets } from "@/lib/metrics";
import { changePassword, saveGoals, saveProfile } from "@/actions/settings";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, Eyebrow } from "@/components/ui/card";
import { Field, FormGrid, Input } from "@/components/ui/form";
import { ActionForm } from "./action-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({ searchParams }: PageProps<"/settings">) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const period = typeof params.month === "string" && /^\d{4}-\d{2}$/.test(params.month) ? params.month : monthKey();
  const targets = await getGoalTargets(user.id, period);

  return (
    <>
      <PageHeader title="Settings" subtitle="Profile, monthly goals and security." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Profile" />
          <ActionForm action={saveProfile} submitLabel="Save profile">
            <FormGrid>
              <Field label="Name">
                <Input name="name" required defaultValue={user.name} />
              </Field>
              <Field label="Title">
                <Input name="title" required defaultValue={user.title} />
              </Field>
              <Field label="Company">
                <Input name="companyName" required defaultValue={user.companyName} />
              </Field>
              <Field label="GitHub username" hint="Used to count your commits">
                <Input name="githubUsername" defaultValue={user.githubUsername ?? ""} />
              </Field>
            </FormGrid>
          </ActionForm>
        </Card>

        <Card>
          <CardHeader title="Password" />
          <ActionForm action={changePassword} submitLabel="Change password" resetOnSuccess>
            <Field label="Current password">
              <Input name="current" type="password" autoComplete="current-password" required />
            </Field>
            <FormGrid>
              <Field label="New password">
                <Input name="next" type="password" autoComplete="new-password" required minLength={10} />
              </Field>
              <Field label="Confirm">
                <Input name="confirm" type="password" autoComplete="new-password" required />
              </Field>
            </FormGrid>
          </ActionForm>
        </Card>

        <Card id="goals" className="scroll-mt-24 lg:col-span-2">
          <CardHeader
            title="Monthly goals"
            subtitle="Targets only — actual values are always calculated from your records."
            action={
              <form className="flex items-center gap-2">
                <Input name="month" type="month" defaultValue={period} className="h-8 w-40" />
                <button className="text-xs text-accent hover:underline">Load</button>
              </form>
            }
          />
          <ActionForm action={saveGoals} submitLabel={`Save goals for ${period}`}>
            <input type="hidden" name="period" value={period} />
            <div className="grid gap-6 md:grid-cols-4">
              {AREAS.map((area) => (
                <div key={area.key} className="space-y-3">
                  <Eyebrow>{area.label}</Eyebrow>
                  {METRICS.filter((m) => m.area === area.key).map((m) => (
                    <Field key={m.key} label={m.unit === "usd" ? `${m.label} (US$)` : m.unit === "brl" ? `${m.label} (R$)` : m.label}>
                      <Input name={m.key} type="number" min="0" step="any" defaultValue={targets[m.key] ?? m.defaultTarget} />
                    </Field>
                  ))}
                </div>
              ))}
            </div>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
