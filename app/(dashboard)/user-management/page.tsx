import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/context";
import { isSlackConfigured } from "@/lib/notifications";
import { UserDirectory, type DirectoryUser } from "@/components/user-management/user-directory";

export const dynamic = "force-dynamic";

const ROLE_MATRIX = [
  { capability: "Author & publish courses", learner: false, admin: true, superAdmin: true },
  { capability: "View tenant analytics & roster", learner: false, admin: true, superAdmin: true },
  { capability: "Edit white-label branding", learner: false, admin: true, superAdmin: true },
  { capability: "Manage users & roles", learner: false, admin: true, superAdmin: true },
  { capability: "Promote to Super Admin", learner: false, admin: false, superAdmin: true },
];

export default async function UserManagementPage() {
  const admin = await requireAdmin();
  const tenant = admin.tenant;

  const [users, departments, instructorCount] = await Promise.all([
    prisma.user.findMany({ where: { tenantId: tenant.id }, include: { department: true }, orderBy: { createdAt: "desc" } }),
    prisma.department.findMany({ where: { tenantId: tenant.id }, orderBy: { name: "asc" } }),
    prisma.instructor.count({ where: { tenantId: tenant.id } }),
  ]);

  const directoryUsers: DirectoryUser[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    jobTitle: u.jobTitle,
    departmentName: u.department?.name ?? null,
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString(),
  }));

  const activeLearners = users.filter((u) => u.role === "LEARNER" && u.isActive).length;
  const staffCount = users.filter((u) => u.role !== "LEARNER").length;
  const deactivatedCount = users.filter((u) => !u.isActive).length;
  const slackReady = isSlackConfigured();

  return (
    <div className="flex flex-col w-full">
      <div className="px-space-sm sm:px-space-lg lg:px-space-xl py-space-lg flex flex-col gap-space-lg max-w-[1600px] mx-auto w-full">
        <div className="flex flex-col gap-1">
          <span className="font-caption text-caption text-secondary uppercase tracking-widest">Admin Workspace / User Management &amp; Access Control</span>
          <h1 className="font-headline-lg-mobile sm:font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-on-surface tracking-tight">
            Organization Directory
          </h1>
          <p className="font-body-md text-body-md text-secondary max-w-2xl">
            Centrally manage {tenant.name}&apos;s learners, instructors, and tenant admins — backed by the live database.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-space-md">
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">Total Provisioned</span>
              <span className="font-headline-lg text-headline-lg text-on-surface font-bold">{users.length.toLocaleString()}</span>
              <span className="font-caption text-caption text-secondary">/ {tenant.seatLimit.toLocaleString()} seats</span>
            </div>
            <span className="w-10 h-10 rounded-lg bg-surface-container-high text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">group</span>
            </span>
          </div>
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">Active Learners</span>
              <span className="font-headline-lg text-headline-lg text-on-surface font-bold">{activeLearners.toLocaleString()}</span>
              <span className="font-caption text-caption text-secondary">Currently enabled</span>
            </div>
            <span className="w-10 h-10 rounded-lg bg-tertiary-fixed/30 text-on-tertiary-fixed-variant flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">school</span>
            </span>
          </div>
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">Instructors &amp; Authors</span>
              <span className="font-headline-lg text-headline-lg text-on-surface font-bold">{instructorCount.toLocaleString()}</span>
              <span className="font-caption text-caption text-secondary">{staffCount} staff accounts</span>
            </div>
            <span className="w-10 h-10 rounded-lg bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">import_contacts</span>
            </span>
          </div>
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">Deactivated</span>
              <span className="font-headline-lg text-headline-lg text-on-surface font-bold">{deactivatedCount.toLocaleString()}</span>
              <span className="font-caption text-caption text-secondary">Seats freed up</span>
            </div>
            <span className="w-10 h-10 rounded-lg bg-error-container text-on-error-container flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">person_off</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
          <div className="lg:col-span-8">
            <UserDirectory users={directoryUsers} departments={departments.map((d) => ({ id: d.id, name: d.name }))} />
          </div>
          <div className="lg:col-span-4 flex flex-col gap-space-md">
            <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-md flex flex-col gap-space-sm">
              <span className="font-title-md text-title-md text-on-surface font-bold">Role &amp; Permission Matrix</span>
              <p className="font-caption text-caption text-secondary">What each role can actually do in this app.</p>
              <table className="w-full text-left border-collapse mt-1">
                <thead>
                  <tr className="font-caption text-caption text-secondary">
                    <th className="py-1.5">Capability</th>
                    <th className="py-1.5 text-center">Admin</th>
                    <th className="py-1.5 text-center">Super</th>
                  </tr>
                </thead>
                <tbody>
                  {ROLE_MATRIX.map((row) => (
                    <tr key={row.capability} className="border-t border-surface-container-low">
                      <td className="py-1.5 font-caption text-caption text-on-surface">{row.capability}</td>
                      <td className="py-1.5 text-center">
                        <span className={`material-symbols-outlined text-sm ${row.admin ? "text-tertiary" : "text-secondary"}`}>{row.admin ? "check" : "remove"}</span>
                      </td>
                      <td className="py-1.5 text-center">
                        <span className={`material-symbols-outlined text-sm ${row.superAdmin ? "text-tertiary" : "text-secondary"}`}>{row.superAdmin ? "check" : "remove"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-md flex flex-col gap-space-sm">
              <div className="flex items-center justify-between">
                <span className="font-title-md text-title-md text-on-surface font-bold">SCIM / SSO Directory Sync</span>
                <span className={`px-2 py-0.5 rounded-full font-caption text-caption font-semibold ${slackReady ? "bg-tertiary-fixed text-on-tertiary-fixed-variant" : "bg-surface-container-high text-secondary"}`}>
                  {slackReady ? "Notifications Connected" : "Not Connected"}
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-secondary">
                {tenant.ssoProvider ?? "No identity provider"} is set as the tenant&apos;s SSO provider in Branding settings, but no live SCIM
                connection is configured in this environment — user provisioning here is manual (Add User / Bulk CSV Import) rather than
                auto-synced from an IdP.
              </p>
              <p className="font-caption text-caption text-secondary">
                To enable real Slack notifications for reminders/nudges, set <code className="bg-surface-container-high px-1 rounded font-mono">SLACK_WEBHOOK_URL</code> in your environment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
