import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/context";
import { isSlackConfigured, isEmailConfigured } from "@/lib/notifications";
import { DepartmentsManager } from "@/components/organization-settings/departments-manager";
import { InstructorsManager } from "@/components/organization-settings/instructors-manager";
import { SeatLimitEditor } from "@/components/organization-settings/seat-limit-editor";

export const dynamic = "force-dynamic";

export default async function OrganizationSettingsPage() {
  const admin = await requireAdmin();
  const tenant = admin.tenant;

  const [departments, instructors, seatsUsed] = await Promise.all([
    prisma.department.findMany({ where: { tenantId: tenant.id }, include: { _count: { select: { users: true } } }, orderBy: { name: "asc" } }),
    prisma.instructor.findMany({ where: { tenantId: tenant.id }, include: { _count: { select: { courses: true } } }, orderBy: { name: "asc" } }),
    prisma.user.count({ where: { tenantId: tenant.id } }),
  ]);

  const slackReady = isSlackConfigured();
  const emailReady = isEmailConfigured();

  return (
    <div className="flex flex-col w-full">
      <div className="px-space-sm sm:px-space-lg lg:px-space-xl py-space-lg flex flex-col gap-space-lg max-w-[1600px] mx-auto w-full">
        <div className="flex flex-col gap-1">
          <span className="font-caption text-caption text-secondary uppercase tracking-widest">Admin Workspace / Organization Settings</span>
          <h1 className="font-headline-lg-mobile sm:font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-on-surface tracking-tight">
            Organization Settings
          </h1>
          <p className="font-body-md text-body-md text-secondary max-w-2xl">
            Manage {tenant.name}&apos;s departments, faculty roster, and integration status.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg items-start">
          <div className="flex flex-col gap-space-lg">
            <SeatLimitEditor initialLimit={tenant.seatLimit} seatsUsed={seatsUsed} />
            <DepartmentsManager initial={departments.map((d) => ({ id: d.id, name: d.name, userCount: d._count.users }))} />
          </div>
          <div className="flex flex-col gap-space-lg">
            <InstructorsManager initial={instructors.map((i) => ({ id: i.id, name: i.name, title: i.title, courseCount: i._count.courses }))} />
            <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col gap-space-sm">
              <span className="font-title-md text-title-md text-on-surface font-bold">Notification Integrations</span>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container-low">
                <span className="font-label-md text-label-md text-on-surface">Slack (compliance reminders)</span>
                <span className={`px-2 py-0.5 rounded-full font-caption text-caption font-semibold ${slackReady ? "bg-tertiary-fixed text-on-tertiary-fixed-variant" : "bg-surface-container-high text-secondary"}`}>
                  {slackReady ? "Connected" : "Not Connected"}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container-low">
                <span className="font-label-md text-label-md text-on-surface">Transactional Email</span>
                <span className={`px-2 py-0.5 rounded-full font-caption text-caption font-semibold ${emailReady ? "bg-tertiary-fixed text-on-tertiary-fixed-variant" : "bg-surface-container-high text-secondary"}`}>
                  {emailReady ? "Connected" : "Not Connected"}
                </span>
              </div>
              <p className="font-caption text-caption text-secondary">
                Set <code className="bg-surface-container-high px-1 rounded font-mono">SLACK_WEBHOOK_URL</code>, or{" "}
                <code className="bg-surface-container-high px-1 rounded font-mono">RESEND_API_KEY</code> +{" "}
                <code className="bg-surface-container-high px-1 rounded font-mono">NOTIFICATIONS_FROM_EMAIL</code>, in your environment to go live.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
