import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/context";
import { initials } from "@/lib/format";
import { SyllabusModal } from "@/components/my-learning/syllabus-modal";
import { RegistryTabs, type RegistryRow } from "@/components/my-learning/registry-tabs";
import { SessionActions } from "@/components/my-learning/session-actions";
import { courseThumbnailUrl } from "@/lib/placeholder-image";

export const dynamic = "force-dynamic";

const CEU_QUARTER_TARGET = 15;

export default async function MyLearningPage() {
  const learner = await requireUser();
  const tenant = learner.tenant;

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: learner.id },
    include: {
      course: { include: { instructor: true, modules: { include: { lessons: true }, orderBy: { order: "asc" } } } },
      moduleProgress: true,
    },
    orderBy: { lastActiveAt: "desc" },
  });

  const certificates = await prisma.certificate.findMany({
    where: { userId: learner.id },
    orderBy: { issuedAt: "desc" },
  });

  const liveSessions = await prisma.liveSession.findMany({
    where: { tenantId: tenant.id },
    include: {
      _count: { select: { registrations: true } },
      registrations: { where: { userId: learner.id } },
    },
    orderBy: { startsAt: "asc" },
  });

  const allLearners = await prisma.user.findMany({
    where: { tenantId: tenant.id, role: "LEARNER" },
    orderBy: { rankPoints: "desc" },
  });
  const alexRankIdx = allLearners.findIndex((u) => u.id === learner.id);
  const leaderboardWindow =
    alexRankIdx < 4 ? allLearners.slice(0, 5) : [...allLearners.slice(0, 2), allLearners[alexRankIdx]];

  const featuredEnrollment = enrollments.find((e) => e.course.modules.length > 0 && e.status === "IN_PROGRESS");
  const inProgressCount = enrollments.filter((e) => e.status === "IN_PROGRESS").length;
  const secondaryEnrollments = enrollments
    .filter((e) => e.status === "IN_PROGRESS" && e.id !== featuredEnrollment?.id)
    .slice(0, 2);

  const weeklyPercent = Math.min(100, Math.round((learner.weeklyHoursLogged / learner.weeklyGoalHours) * 100));
  const underReviewCerts = certificates.filter((c) => c.status === "UNDER_REVIEW").length;
  const featuredCert = certificates.find((c) => c.status === "ACTIVE") ?? certificates[0];
  const percentile = allLearners.length > 0 ? Math.max(1, Math.round(((alexRankIdx + 1) / allLearners.length) * 100)) : 100;

  const registryRows: RegistryRow[] = enrollments.map((e) => ({
    enrollmentId: e.id,
    courseId: e.courseId,
    title: e.course.title,
    instructorName: e.course.instructor?.name ?? null,
    progressPercent: e.progressPercent,
    hoursLogged: e.hoursLogged,
    status: e.status,
    isMandatory: e.course.isMandatory,
    isSaved: e.isSaved,
    lastActiveAt: e.lastActiveAt ? e.lastActiveAt.toISOString() : null,
    nextUp:
      e.status === "COMPLETED"
        ? "Completed"
        : e.status === "OVERDUE"
          ? "Overdue"
          : e.status === "NOT_STARTED"
            ? "Not started yet"
            : e.course.isCohort
              ? "Live cohort sprint"
              : `${e.completedLessons} of ${e.totalLessons} lessons`,
  }));

  return (
    <div className="flex flex-col w-full">
      <div className="px-space-sm sm:px-space-lg lg:px-space-xl py-space-lg flex flex-col gap-space-lg max-w-[1600px] mx-auto w-full">
        {/* Welcome & Streak Banner */}
        <div className="relative overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm p-space-md sm:p-space-lg">
          <div className="absolute -right-12 -top-16 w-80 h-80 rounded-full bg-gradient-to-br from-primary-fixed-dim/30 to-tertiary-fixed-dim/20 blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
            <div className="flex flex-col gap-1 max-w-2xl">
              <div className="flex items-center gap-space-sm flex-wrap">
                <span className="font-headline-lg-mobile sm:font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-on-surface tracking-tight">
                  Welcome back, {learner.name.split(" ")[0]}
                </span>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container/60 text-on-secondary-fixed text-label-sm font-label-sm shadow-sm">
                  <span className="text-base leading-none">🔥</span>
                  <span>{learner.streakDays}-Day Streak Active</span>
                </div>
              </div>
              <p className="font-body-md text-body-md text-secondary">
                You&apos;re on a {learner.streakDays}-day learning streak! You&apos;ve logged {learner.weeklyHoursLogged}h
                toward your weekly target of {learner.weeklyGoalHours}h.
              </p>
            </div>
            {featuredEnrollment ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto shrink-0">
                <button className="h-10 px-4 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md flex items-center justify-center gap-2 transition-all" type="button">
                  <span className="material-symbols-outlined text-lg text-secondary">tune</span>
                  Study Preferences
                </button>
                <button className="h-10 px-5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md flex items-center justify-center gap-2 shadow-sm transition-all" type="button">
                  <span className="material-symbols-outlined text-lg">play_arrow</span>
                  Resume {featuredEnrollment.course.title.split(" ").slice(0, 2).join(" ")}
                </button>
              </div>
            ) : null}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md mt-space-lg">
            <div className="p-space-md rounded-xl bg-surface-container-low flex items-center justify-between gap-3 hover:bg-surface-container transition-colors">
              <div className="flex flex-col">
                <span className="font-caption text-caption text-secondary uppercase tracking-wider">Weekly Target</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="font-headline-md text-headline-md text-on-surface">{learner.weeklyHoursLogged}</span>
                  <span className="font-body-sm text-body-sm text-secondary">/ {learner.weeklyGoalHours} hrs</span>
                </div>
                <span className="font-caption text-caption text-tertiary font-semibold flex items-center gap-1 mt-1">
                  <span className="material-symbols-outlined text-sm">trending_up</span> {weeklyPercent}% achieved
                </span>
              </div>
              <div className="relative w-14 h-14 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path className="text-surface-container-highest" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.5" />
                  <path className="text-primary" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${weeklyPercent}, 100`} strokeLinecap="round" strokeWidth="3.5" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-label-sm text-label-sm text-on-surface font-semibold">{weeklyPercent}%</div>
              </div>
            </div>
            <div className="p-space-md rounded-xl bg-surface-container-low flex items-center justify-between gap-3 hover:bg-surface-container transition-colors">
              <div className="flex flex-col">
                <span className="font-caption text-caption text-secondary uppercase tracking-wider">Certificates</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="font-headline-md text-headline-md text-on-surface">{certificates.length}</span>
                  <span className="font-body-sm text-body-sm text-secondary">Earned</span>
                </div>
                <span className="font-caption text-caption text-secondary flex items-center gap-1 mt-1">
                  <span className="material-symbols-outlined text-sm text-secondary">pending_actions</span>{" "}
                  {underReviewCerts} under audit review
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-surface-container-highest text-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  workspace_premium
                </span>
              </div>
            </div>
            <div className="p-space-md rounded-xl bg-surface-container-low flex items-center justify-between gap-3 hover:bg-surface-container transition-colors">
              <div className="flex flex-col">
                <span className="font-caption text-caption text-secondary uppercase tracking-wider">Peer Standing</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="font-headline-md text-headline-md text-on-surface">Top {percentile}%</span>
                </div>
                <span className="font-caption text-caption text-secondary flex items-center gap-1 mt-1">
                  Rank {alexRankIdx + 1} of {allLearners.length} learners
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-tertiary-fixed/40 text-tertiary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  military_tech
                </span>
              </div>
            </div>
            <div className="p-space-md rounded-xl bg-surface-container-low flex items-center justify-between gap-3 hover:bg-surface-container transition-colors">
              <div className="flex flex-col">
                <span className="font-caption text-caption text-secondary uppercase tracking-wider">CEU Accrual</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="font-headline-md text-headline-md text-on-surface">{learner.ceuCredits}</span>
                  <span className="font-body-sm text-body-sm text-secondary">Credits</span>
                </div>
                <span className="font-caption text-caption text-secondary flex items-center gap-1 mt-1">
                  <span className="material-symbols-outlined text-sm text-primary">verified</span>{" "}
                  {learner.ceuCredits >= CEU_QUARTER_TARGET ? "Q4 Corporate Target Met" : `${(CEU_QUARTER_TARGET - learner.ceuCredits).toFixed(1)} credits to Q4 target`}
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-surface-container-highest text-primary-container flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl">auto_stories</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-8 flex flex-col gap-space-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">play_circle</span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Continue Learning (Active Modules)</h2>
              </div>
              <div className="hidden sm:flex items-center gap-2 font-caption text-caption text-secondary">
                <span>{inProgressCount} Active Enrollments</span>
              </div>
            </div>

            {featuredEnrollment ? (
              <div className="rounded-xl bg-surface-container-lowest shadow-sm overflow-hidden flex flex-col group transition-all hover:shadow-md">
                <div className="grid grid-cols-1 md:grid-cols-12">
                  <div className="md:col-span-5 relative min-h-[160px] sm:min-h-[220px] bg-surface-container overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={courseThumbnailUrl(featuredEnrollment.courseId)}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/80 via-inverse-surface/30 to-transparent flex flex-col justify-between p-4">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-md bg-surface-container-lowest/90 backdrop-blur-md text-on-surface font-caption text-caption font-semibold uppercase">
                          {featuredEnrollment.course.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-inverse-on-surface font-caption text-caption">
                        <span className="material-symbols-outlined text-sm">schedule</span>
                        <span>{featuredEnrollment.totalLessons - featuredEnrollment.completedLessons} lessons left</span>
                      </div>
                    </div>
                  </div>
                  <div className="md:col-span-7 p-space-md lg:p-space-lg flex flex-col justify-between gap-4">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-caption text-caption text-tertiary font-semibold uppercase tracking-wider">
                          {featuredEnrollment.course.modules.find((m) => m.id && featuredEnrollment.moduleProgress.find((mp) => mp.moduleId === m.id && mp.status === "ACTIVE"))?.title
                            ? `Module in progress: ${featuredEnrollment.course.modules.find((m) => featuredEnrollment.moduleProgress.find((mp) => mp.moduleId === m.id && mp.status === "ACTIVE"))?.title}`
                            : "In progress"}
                        </span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold">
                          {Math.round(featuredEnrollment.progressPercent)}% Complete
                        </span>
                      </div>
                      <h3 className="font-title-md text-title-md text-on-surface font-bold">{featuredEnrollment.course.title}</h3>
                      <p className="font-body-sm text-body-sm text-secondary line-clamp-2">{featuredEnrollment.course.description}</p>
                      <div className="flex items-center gap-4 text-secondary font-caption text-caption pt-1">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">check_circle</span>{" "}
                          {featuredEnrollment.completedLessons} / {featuredEnrollment.totalLessons} Lessons Done
                        </span>
                        {featuredEnrollment.course.instructor ? (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">person</span> {featuredEnrollment.course.instructor.name}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                        <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: `${featuredEnrollment.progressPercent}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                      <div className="flex items-center gap-2">
                        <button className="h-9 px-4 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md flex items-center gap-2 shadow-sm transition-all" type="button">
                          <span className="material-symbols-outlined text-base">play_arrow</span>
                          Resume Lesson
                        </button>
                        <SyllabusModal
                          courseTitle={featuredEnrollment.course.title}
                          progressPercent={Math.round(featuredEnrollment.progressPercent)}
                          modules={featuredEnrollment.course.modules.map((m) => ({
                            id: m.id,
                            title: m.title,
                            order: m.order,
                            status: featuredEnrollment.moduleProgress.find((mp) => mp.moduleId === m.id)?.status ?? "LOCKED",
                          }))}
                        />
                      </div>
                      <button className="h-9 w-9 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface-variant flex items-center justify-center transition-colors" title="Download for offline study" type="button">
                        <span className="material-symbols-outlined text-base">download</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {secondaryEnrollments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                {secondaryEnrollments.map((e) => (
                  <div key={e.id} className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm flex flex-col justify-between gap-4 hover:shadow-md transition-shadow">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        {e.course.isMandatory ? (
                          <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container font-caption text-caption font-semibold uppercase tracking-wide">
                            {e.course.dueDate ? `Due Soon` : "Mandatory"}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-caption text-caption font-semibold uppercase tracking-wide">
                            {e.course.isCohort ? "Live Cohort Sprint" : "Self-Paced"}
                          </span>
                        )}
                        <span className="font-caption text-caption text-secondary">{e.course.category}</span>
                      </div>
                      <h4 className="font-title-md text-title-md text-on-surface font-semibold">{e.course.title}</h4>
                      <p className="font-body-sm text-body-sm text-secondary line-clamp-2">{e.course.description}</p>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-surface-container overflow-hidden">
                          <div className="bg-primary h-full rounded-full" style={{ width: `${e.progressPercent}%` }} />
                        </div>
                        <span className="font-caption text-caption text-secondary">{Math.round(e.progressPercent)}% Complete</span>
                      </div>
                      <button className="h-8 px-3 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-sm text-label-sm flex items-center gap-1 transition-colors" type="button">
                        <span>Continue</span>
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <RegistryTabs rows={registryRows} />
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="lg:col-span-4 flex flex-col gap-space-lg">
            {featuredCert ? (
              <div className="rounded-xl bg-surface-container-lowest shadow-sm p-space-md flex flex-col gap-4 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-xl">verified</span>
                    <h3 className="font-title-md text-title-md text-on-surface font-bold">Featured Credential</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed/50 text-on-tertiary-fixed-variant font-caption text-caption font-semibold">
                    {featuredCert.status === "ACTIVE" ? "Verified Active" : "Under Review"}
                  </span>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-inverse-surface via-primary to-inverse-surface text-inverse-on-surface p-space-md flex flex-col justify-between min-h-[170px] shadow-sm relative overflow-hidden">
                  <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-surface-tint/20 blur-xl" />
                  <div className="flex items-start justify-between relative z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-md bg-inverse-on-surface/20 backdrop-blur-md flex items-center justify-center font-label-sm text-label-sm font-bold text-inverse-on-surface">
                        {initials(tenant.name)}
                      </div>
                      <span className="font-caption text-caption tracking-wider uppercase opacity-80">
                        {tenant.name} • EduStack
                      </span>
                    </div>
                    <span className="material-symbols-outlined text-xl opacity-70">shield</span>
                  </div>
                  <div className="flex flex-col gap-0.5 relative z-10">
                    <span className="font-title-md text-title-md font-bold tracking-tight text-inverse-on-surface">{featuredCert.title}</span>
                    <span className="font-caption text-caption opacity-80">Credential ID: {featuredCert.credentialId}</span>
                  </div>
                  <div className="flex items-center justify-between font-caption text-caption pt-2 border-t border-inverse-on-surface/15 relative z-10">
                    <span className="opacity-75">Issued: {featuredCert.issuedAt.toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
                    <span className="text-tertiary-fixed font-semibold">Permanent Record</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button className="h-9 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-sm text-label-sm flex items-center justify-center gap-1.5 transition-colors" type="button">
                    <span className="material-symbols-outlined text-base text-secondary">picture_as_pdf</span>
                    <span>PDF Certificate</span>
                  </button>
                  <button className="h-9 rounded-lg bg-primary-container text-on-primary-container hover:bg-primary font-label-sm text-label-sm flex items-center justify-center gap-1.5 transition-colors" type="button">
                    <span className="material-symbols-outlined text-base">share</span>
                    <span>LinkedIn</span>
                  </button>
                </div>
              </div>
            ) : null}

            {liveSessions.length > 0 ? (
              <div className="rounded-xl bg-surface-container-lowest shadow-sm p-space-md flex flex-col gap-space-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-xl">cast_for_education</span>
                    <h3 className="font-title-md text-title-md text-on-surface font-bold">Upcoming Workshops</h3>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  {liveSessions.map((s) => (
                    <div key={s.id} className="p-3 rounded-lg bg-surface-container-low flex flex-col gap-2 hover:bg-surface-container transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <span className="px-2 py-0.5 rounded bg-primary-container text-on-primary-container font-caption text-caption font-semibold">
                          {s.type === "LIVE_QA" ? "Live Q&A" : s.type === "OFFICE_HOURS" ? "Office Hours" : "Workshop"}
                        </span>
                        <span className="font-caption text-caption text-secondary">
                          {s.startsAt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} •{" "}
                          {s.startsAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </span>
                      </div>
                      <span className="font-label-md text-label-md text-on-surface font-semibold">{s.title}</span>
                      <div className="flex items-center justify-between pt-1 font-caption text-caption">
                        <span className="text-secondary">{s._count.registrations} Registered • {s.hostName}</span>
                        <SessionActions
                          sessionId={s.id}
                          title={s.title}
                          description={`${s.type === "LIVE_QA" ? "Live Q&A" : s.type === "OFFICE_HOURS" ? "Office Hours" : "Workshop"} hosted by ${s.hostName}`}
                          startsAt={s.startsAt.toISOString()}
                          alreadyRegistered={s.registrations.length > 0}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-xl bg-surface-container-lowest shadow-sm p-space-md flex flex-col gap-space-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">leaderboard</span>
                  <h3 className="font-title-md text-title-md text-on-surface font-bold">Sprint Leaderboard</h3>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {leaderboardWindow.map((u) => {
                  const rank = allLearners.findIndex((x) => x.id === u.id) + 1;
                  const isYou = u.id === learner.id;
                  return (
                    <div
                      key={u.id}
                      className={`p-2.5 rounded-lg flex items-center justify-between ${isYou ? "bg-primary-container/10" : "bg-surface-container-low/50"}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-caption text-caption font-bold shrink-0 ${
                            isYou ? "bg-primary text-on-primary" : rank === 1 ? "bg-tertiary-fixed text-on-tertiary-fixed-variant" : "bg-surface-container-high text-secondary"
                          }`}
                        >
                          {rank}
                        </div>
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-caption text-caption font-bold shrink-0 ${
                            isYou ? "bg-primary-container text-on-primary-container" : "bg-secondary-container text-on-secondary-container"
                          }`}
                        >
                          {isYou ? "You" : initials(u.name)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className={`font-label-md text-label-md truncate font-semibold ${isYou ? "text-primary" : "text-on-surface"}`}>
                            {isYou ? `${u.name} (You)` : u.name}
                          </span>
                          <span className="font-caption text-caption text-secondary truncate">{u.jobTitle ?? "Learner"}</span>
                        </div>
                      </div>
                      <span className={`font-label-sm text-label-sm font-semibold shrink-0 ${isYou ? "text-primary font-bold" : "text-on-surface"}`}>
                        {u.rankPoints.toLocaleString()} pts
                      </span>
                    </div>
                  );
                })}
              </div>
              <button className="w-full h-8 rounded-lg bg-surface-container-low hover:bg-surface-container text-secondary hover:text-on-surface font-label-sm text-label-sm flex items-center justify-center gap-1 transition-colors" type="button">
                <span>View Full Leaderboard ({allLearners.length} Peers)</span>
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
