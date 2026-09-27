import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/context";
import { dueInDays, formatMonthLabel } from "@/lib/format";
import { DepartmentSwitcher } from "@/components/analytics/department-switcher";
import { RemindButton } from "@/components/analytics/remind-button";
import { ComplianceRoster, type RosterRow } from "@/components/analytics/compliance-roster";
import { ExecutiveActions } from "@/components/analytics/executive-actions";

export const dynamic = "force-dynamic";

export default async function AnalyticsCompliancePage({
  searchParams,
}: {
  searchParams: Promise<{ dept?: string }>;
}) {
  const { dept: selectedDeptId } = await searchParams;
  const admin = await requireAdmin();
  const tenant = admin.tenant;

  const departments = await prisma.department.findMany({
    where: { tenantId: tenant.id },
    include: { _count: { select: { users: true } } },
    orderBy: { name: "asc" },
  });
  const totalLearners = await prisma.user.count({ where: { tenantId: tenant.id, role: "LEARNER" } });

  const selectedDept = selectedDeptId ? departments.find((d) => d.id === selectedDeptId) : null;
  const learners = await prisma.user.findMany({
    where: { tenantId: tenant.id, role: "LEARNER", ...(selectedDept ? { departmentId: selectedDept.id } : {}) },
    include: { department: true },
  });
  const learnerIds = learners.map((l) => l.id);

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: { in: learnerIds } },
    include: { course: true, user: true },
  });

  const completed = enrollments.filter((e) => e.status === "COMPLETED");
  const cohortCompletionRate = enrollments.length > 0 ? (completed.length / enrollments.length) * 100 : 0;
  const learningVolumeHours = enrollments.reduce((sum, e) => sum + e.hoursLogged, 0);
  const certifiedBadges = await prisma.certificate.count({ where: { userId: { in: learnerIds }, status: "ACTIVE" } });
  const satisfactionScores = enrollments.map((e) => e.satisfactionScore).filter((s): s is number => s != null);
  const csat = satisfactionScores.length > 0 ? satisfactionScores.reduce((a, b) => a + b, 0) / satisfactionScores.length : 0;

  // Monthly completions trend (last 6 months)
  const monthBuckets: { label: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const bucketDate = new Date();
    bucketDate.setDate(1);
    bucketDate.setMonth(bucketDate.getMonth() - i);
    const count = completed.filter((e) => {
      if (!e.completedAt) return false;
      return e.completedAt.getFullYear() === bucketDate.getFullYear() && e.completedAt.getMonth() === bucketDate.getMonth();
    }).length;
    monthBuckets.push({ label: formatMonthLabel(bucketDate), count });
  }
  const maxMonthCount = Math.max(1, ...monthBuckets.map((m) => m.count));

  // Top courses by adoption + pass rate
  const courseAgg = new Map<string, { title: string; enrolled: number; completed: number }>();
  for (const e of enrollments) {
    const agg = courseAgg.get(e.courseId) ?? { title: e.course.title, enrolled: 0, completed: 0 };
    agg.enrolled += 1;
    if (e.status === "COMPLETED") agg.completed += 1;
    courseAgg.set(e.courseId, agg);
  }
  const topCourses = Array.from(courseAgg.values())
    .map((c) => ({ ...c, passRate: c.enrolled > 0 ? (c.completed / c.enrolled) * 100 : 0 }))
    .sort((a, b) => b.enrolled - a.enrolled)
    .slice(0, 3);

  // Compliance banner: most urgent mandatory course by soonest due date among selected learners
  const mandatoryEnrollments = enrollments.filter((e) => e.course.isMandatory);
  const bannerByCourse = new Map<string, { courseId: string; title: string; dueDate: Date | null; total: number; done: number; overdue: number }>();
  for (const e of mandatoryEnrollments) {
    const agg = bannerByCourse.get(e.courseId) ?? { courseId: e.courseId, title: e.course.title, dueDate: e.course.dueDate, total: 0, done: 0, overdue: 0 };
    agg.total += 1;
    if (e.status === "COMPLETED") agg.done += 1;
    if (e.status === "OVERDUE") agg.overdue += 1;
    bannerByCourse.set(e.courseId, agg);
  }
  const bannerCourse = Array.from(bannerByCourse.values()).sort((a, b) => (a.dueDate?.getTime() ?? Infinity) - (b.dueDate?.getTime() ?? Infinity))[0];
  const bannerComplianceRate = bannerCourse && bannerCourse.total > 0 ? Math.round((bannerCourse.done / bannerCourse.total) * 100) : 0;

  const rosterRows: RosterRow[] = mandatoryEnrollments.map((e) => ({
    enrollmentId: e.id,
    userName: e.user.name,
    userEmail: e.user.email,
    departmentName: learners.find((l) => l.id === e.userId)?.department?.name ?? "—",
    courseTitle: e.course.title,
    progressPercent: e.progressPercent,
    status: e.status,
    lastActiveAt: e.lastActiveAt ? e.lastActiveAt.toISOString() : null,
    remindedAt: e.remindedAt ? e.remindedAt.toISOString() : null,
  }));

  return (
    <div className="flex flex-col w-full">
      <div className="p-space-sm sm:p-space-lg lg:p-space-lg max-w-[1600px] mx-auto w-full flex flex-col gap-space-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div className="flex flex-col gap-space-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-caption text-caption text-secondary uppercase tracking-widest">{tenant.domain}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-secondary-container" />
              <span className="flex items-center gap-1.5 font-label-sm text-label-sm text-tertiary">
                <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
                Live database sync
              </span>
            </div>
            <div className="flex items-center gap-space-md flex-wrap">
              <h1 className="font-headline-lg-mobile sm:font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-on-surface tracking-tight">
                Tenant Analytics &amp; Compliance
              </h1>
              <DepartmentSwitcher
                departments={departments.map((d) => ({ id: d.id, name: d.name, learnerCount: d._count.users }))}
                selectedLabel={selectedDept ? `${selectedDept.name} (${selectedDept._count.users} Learners)` : `All Organization (${totalLearners} Learners)`}
                totalLearners={totalLearners}
              />
            </div>
          </div>
          <div className="flex items-center gap-space-sm flex-wrap">
            <ExecutiveActions
              summary={{
                tenantName: tenant.name,
                scopeLabel: selectedDept ? `${selectedDept.name} (${selectedDept._count.users} Learners)` : `All Organization (${totalLearners} Learners)`,
                generatedAt: new Date().toLocaleString("en-US"),
                kpis: [
                  { label: "Cohort Completion", value: `${cohortCompletionRate.toFixed(1)}%` },
                  { label: "Learning Volume", value: `${Math.round(learningVolumeHours)}h` },
                  { label: "Certified Badges", value: String(certifiedBadges) },
                  { label: "Learner Satisfaction", value: csat > 0 ? `${csat.toFixed(1)} / 5.0` : "—" },
                ],
                topCourses,
                overdueLearners: enrollments
                  .filter((e) => e.status === "OVERDUE")
                  .map((e) => ({ name: e.user.name, course: e.course.title, progress: e.progressPercent })),
              }}
            />
          </div>
        </div>

        {bannerCourse ? (
          <div className="relative overflow-hidden rounded-xl bg-surface-container-lowest shadow-md p-space-md sm:p-space-lg flex flex-col lg:flex-row lg:items-center justify-between gap-space-lg">
            <div className="absolute left-0 top-0 bottom-0 w-2 bg-error" />
            <div className="flex items-start gap-space-md max-w-3xl">
              <div className="w-12 h-12 rounded-xl bg-error-container text-on-error-container flex items-center justify-center shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  shield_with_heart
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm uppercase font-bold tracking-wider">Mandatory Compliance</span>
                  {bannerCourse.dueDate ? (
                    <span className="font-caption text-caption text-error font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">schedule</span> Deadline: {dueInDays(bannerCourse.dueDate)} days remaining
                    </span>
                  ) : null}
                </div>
                <h2 className="font-headline-sm text-headline-sm text-on-surface">{bannerCourse.title}</h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  {bannerCourse.total} team members assigned. {bannerCourse.overdue} learners have pending simulation tests.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-space-md shrink-0">
              <div className="bg-surface-container-low rounded-xl p-space-sm px-space-md flex flex-col justify-center min-w-[220px]">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-label-sm text-label-sm text-secondary font-medium">Compliance Rate</span>
                  <span className="font-label-md text-label-md text-on-surface font-bold">{bannerComplianceRate}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
                  <div className="h-full bg-tertiary-container rounded-full transition-all duration-700" style={{ width: `${bannerComplianceRate}%` }} />
                </div>
                <div className="flex justify-between items-center mt-1.5 text-caption font-caption">
                  <span className="text-tertiary font-semibold">
                    {bannerCourse.done} / {bannerCourse.total} Completed
                  </span>
                  <span className="text-error font-bold">{bannerCourse.overdue} Overdue</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <RemindButton courseId={bannerCourse.courseId} overdueCount={bannerCourse.overdue} />
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-space-md">
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">Cohort Completion</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-headline-lg text-headline-lg text-on-surface font-bold">{cohortCompletionRate.toFixed(1)}%</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-tertiary-fixed/30 text-on-tertiary-fixed-variant flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">verified</span>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="font-caption text-caption text-secondary">{completed.length} of {enrollments.length} enrollments completed</span>
            </div>
          </div>
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">Learning Volume</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-headline-lg text-headline-lg text-on-surface font-bold">{Math.round(learningVolumeHours)}h</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary-fixed text-on-primary-fixed flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">timelapse</span>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="font-caption text-caption text-secondary">Across {learners.length} learners</span>
            </div>
          </div>
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">Certified Badges</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-headline-lg text-headline-lg text-on-surface font-bold">{certifiedBadges}</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">workspace_premium</span>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="font-caption text-caption text-secondary">Active credentials issued</span>
            </div>
          </div>
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">Learner Satisfaction</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-headline-lg text-headline-lg text-on-surface font-bold">
                    {csat > 0 ? csat.toFixed(1) : "—"} <span className="text-secondary font-title-md">/ 5.0</span>
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-surface-container-high text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">sentiment_very_satisfied</span>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="font-caption text-caption text-secondary">{satisfactionScores.length} verified reviews</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
          <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl p-space-md sm:p-space-lg shadow-sm flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm mb-space-md">
              <div className="flex flex-col">
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Monthly Completions Trend</h3>
                <p className="font-body-sm text-body-sm text-secondary">Validated syllabus and milestone course certificates awarded</p>
              </div>
            </div>
            <div className="h-56 sm:h-64 w-full flex items-end justify-between gap-2 sm:gap-3 pt-4 px-2 pb-2">
              {monthBuckets.map((m, idx) => {
                const isLast = idx === monthBuckets.length - 1;
                const heightPercent = Math.max(4, Math.round((m.count / maxMonthCount) * 100));
                return (
                  <div key={m.label + idx} className="group flex-1 flex flex-col items-center gap-2 h-full justify-end cursor-pointer relative">
                    {isLast ? (
                      <div className="absolute -top-3 px-2 py-0.5 rounded-full bg-primary text-on-primary text-[10px] font-bold">{m.count}</div>
                    ) : (
                      <span className="text-caption font-caption text-secondary opacity-0 group-hover:opacity-100 transition-opacity">{m.count}</span>
                    )}
                    <div
                      className={`w-full rounded-t-lg transition-all ${isLast ? "bg-primary shadow-sm" : "bg-surface-container-high group-hover:bg-primary-container/70"}`}
                      style={{ height: `${heightPercent}%` }}
                    />
                    <span className={`text-caption font-caption font-medium ${isLast ? "text-primary font-bold" : "text-secondary group-hover:text-on-surface"}`}>{m.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="lg:col-span-5 bg-surface-container-lowest rounded-xl p-space-md sm:p-space-lg shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-space-sm">
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Course Adoption &amp; Pass Rates</h3>
                <span className="font-body-sm text-body-sm text-secondary">Ranked by completion volume &amp; cohort scores</span>
              </div>
            </div>
            <div className="flex flex-col gap-space-sm my-auto">
              {topCourses.length === 0 ? (
                <p className="font-body-sm text-body-sm text-secondary">No enrollment data yet for this scope.</p>
              ) : (
                topCourses.map((c, idx) => (
                  <div key={c.title} className="p-space-sm rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-6 h-6 rounded bg-primary-container text-on-primary font-bold text-xs flex items-center justify-center">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <span className="font-label-md text-label-md text-on-surface font-semibold truncate">{c.title}</span>
                      </div>
                      <span className="font-label-sm text-label-sm text-tertiary font-bold shrink-0">{Math.round(c.passRate)}% Pass</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                      <div className="bg-tertiary-container h-full rounded-full" style={{ width: `${c.passRate}%` }} />
                    </div>
                    <div className="flex items-center justify-between font-caption text-caption text-secondary">
                      <span>{c.enrolled} Enrolled</span>
                      <span>{c.completed} Completed</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <ComplianceRoster rows={rosterRows} />
      </div>
    </div>
  );
}
