import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/context";
import { dueInDays } from "@/lib/format";
import { CatalogGrid, type CatalogCourse } from "@/components/course-catalog/catalog-grid";
import { NewCourseButton } from "@/components/course-studio/new-course-button";

export const dynamic = "force-dynamic";

export default async function CourseCatalogPage() {
  const learner = await requireUser();
  const tenant = learner.tenant;

  const courses = await prisma.course.findMany({
    where: { tenantId: tenant.id, isPublished: true },
    include: { instructor: true, _count: { select: { modules: true } } },
    orderBy: { createdAt: "asc" },
  });

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: learner.id },
  });
  const enrollmentByCourse = new Map(enrollments.map((e) => [e.courseId, e]));

  const catalogCourses: CatalogCourse[] = courses.map((c) => {
    const enrollment = enrollmentByCourse.get(c.id);
    return {
      id: c.id,
      title: c.title,
      description: c.description,
      category: c.category,
      difficulty: c.difficulty,
      ceuCredits: c.ceuCredits,
      durationHours: c.durationHours,
      rating: c.rating,
      ratingCount: c.ratingCount,
      instructorName: c.instructor?.name ?? null,
      instructorTitle: c.instructor?.title ?? null,
      isCohort: c.isCohort,
      isMandatory: c.isMandatory,
      cohortTeamPercent: c.cohortTeamPercent,
      moduleCount: c._count.modules,
      passRatePercent: c.passRatePercent,
      dueInDays: dueInDays(c.dueDate),
      enrollmentStatus: enrollment?.status ?? null,
      enrollmentProgress: enrollment?.progressPercent ?? 0,
      isSaved: enrollment?.isSaved ?? false,
    };
  });

  const complianceBannerEnrollment = enrollments
    .filter((e) => e.status !== "COMPLETED")
    .map((e) => ({ e, course: courses.find((c) => c.id === e.courseId)! }))
    .filter(({ course }) => course.isMandatory && course.dueDate)
    .sort((a, b) => a.course.dueDate!.getTime() - b.course.dueDate!.getTime())[0];

  return (
    <div className="flex flex-col w-full">
      <div className="px-space-sm sm:px-space-lg lg:px-space-xl py-space-lg flex flex-col gap-space-lg max-w-[1600px] mx-auto w-full">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-space-sm flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-primary-container text-on-primary-container font-label-sm text-label-sm uppercase tracking-wider">
                Enterprise LMS
              </span>
              {tenant.ssoEnabled ? (
                <span className="font-caption text-caption text-secondary flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-tertiary inline-block" />
                  {tenant.ssoProvider} Synced
                </span>
              ) : null}
            </div>
            <h1 className="font-headline-lg-mobile sm:font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-on-surface tracking-tight">
              Enterprise Learning Catalog
            </h1>
            <p className="font-body-md text-body-md text-secondary max-w-2xl">
              Browse certified training pathways, CEU accredited cohorts, and on-demand technical courses for {tenant.name}.
            </p>
          </div>
          <div className="flex items-center gap-space-sm shrink-0">
            <NewCourseButton isCohort label="Create Cohort" />
          </div>
        </div>

        {complianceBannerEnrollment ? (
          <div className="relative overflow-hidden rounded-xl bg-inverse-surface text-inverse-on-surface p-space-md sm:p-space-lg shadow-xl">
            <div className="absolute -right-16 -top-16 w-80 h-80 bg-primary-container/20 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-space-md">
              <div className="flex items-start gap-space-md max-w-3xl">
                <div className="w-12 h-12 rounded-xl bg-error/20 text-error-container flex items-center justify-center shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-2xl text-red-300">security_update_warning</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-space-sm flex-wrap">
                    <span className="px-2 py-0.5 rounded-full bg-error text-on-error font-label-sm text-label-sm">Mandatory Compliance</span>
                    <span className="font-label-sm text-label-sm text-tertiary-fixed flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">schedule</span> Due in{" "}
                      {dueInDays(complianceBannerEnrollment.course.dueDate)} days
                    </span>
                  </div>
                  <h2 className="font-headline-sm text-headline-sm text-white">{complianceBannerEnrollment.course.title}</h2>
                  <div className="flex items-center gap-space-md text-surface-dim font-caption text-caption pt-1 flex-wrap">
                    <span>Duration: {complianceBannerEnrollment.course.durationHours}h</span>
                    <span>•</span>
                    <span>{complianceBannerEnrollment.course.ceuCredits} CEU Credits</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-space-md w-full lg:w-auto shrink-0">
                <div className="bg-surface-container-low rounded-xl p-space-sm px-space-md flex flex-col justify-center min-w-[220px]">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="font-label-sm text-label-sm text-secondary font-medium">Progress</span>
                    <span className="font-label-md text-label-md text-on-surface font-bold">
                      {Math.round(complianceBannerEnrollment.e.progressPercent)}% Completed
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
                    <div className="bg-primary-fixed-dim h-full rounded-full" style={{ width: `${complianceBannerEnrollment.e.progressPercent}%` }} />
                  </div>
                  <span className="font-caption text-caption text-secondary mt-1.5">
                    {complianceBannerEnrollment.e.completedLessons} of {complianceBannerEnrollment.e.totalLessons} lessons completed
                  </span>
                </div>
                <a className="h-11 px-space-md rounded-lg bg-primary-container text-on-primary-container hover:bg-primary font-label-md text-label-md flex items-center justify-center gap-2 transition-all shadow-md shrink-0" href="#">
                  <span className="material-symbols-outlined text-lg">play_circle</span>
                  Resume Module
                </a>
              </div>
            </div>
          </div>
        ) : null}

        <CatalogGrid courses={catalogCourses} />
      </div>
    </div>
  );
}
