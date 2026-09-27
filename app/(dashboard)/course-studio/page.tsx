import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/context";
import { NewCourseButton } from "@/components/course-studio/new-course-button";

export const dynamic = "force-dynamic";

export default async function CourseStudioPage() {
  const admin = await requireAdmin();
  const tenant = admin.tenant;
  const courses = await prisma.course.findMany({
    where: { tenantId: tenant.id },
    include: { instructor: true, _count: { select: { modules: true, enrollments: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="flex flex-col w-full">
      <div className="px-space-sm sm:px-space-lg lg:px-space-xl py-space-lg flex flex-col gap-space-lg max-w-[1600px] mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
          <div className="flex flex-col gap-1">
            <span className="font-caption text-caption text-secondary uppercase tracking-widest">Admin Workspace / Course Studio</span>
            <h1 className="font-headline-lg-mobile sm:font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-on-surface tracking-tight">
              Course Authoring Studio
            </h1>
            <p className="font-body-md text-body-md text-secondary max-w-2xl">
              Build curriculum, manage modules and lessons, and publish courses to {tenant.name}&apos;s catalog.
            </p>
          </div>
          <NewCourseButton />
        </div>

        <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-secondary font-label-sm text-label-sm">
                <th className="py-3 px-space-md">Course</th>
                <th className="py-3 px-space-sm">Instructor</th>
                <th className="py-3 px-space-sm">Modules</th>
                <th className="py-3 px-space-sm">Enrolled</th>
                <th className="py-3 px-space-sm">Status</th>
                <th className="py-3 px-space-sm">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low font-body-sm text-body-sm">
              {courses.map((c) => (
                <tr key={c.id} className="hover:bg-surface-container-low/60 transition-colors">
                  <td className="py-3 px-space-md">
                    <Link href={`/course-studio/${c.id}`} className="font-label-md text-label-md text-primary hover:underline font-semibold">
                      {c.title}
                    </Link>
                    <div className="font-caption text-caption text-secondary">{c.category}</div>
                  </td>
                  <td className="py-3 px-space-sm text-on-surface-variant">{c.instructor?.name ?? "Unassigned"}</td>
                  <td className="py-3 px-space-sm text-on-surface-variant">{c._count.modules}</td>
                  <td className="py-3 px-space-sm text-on-surface-variant">{c._count.enrollments}</td>
                  <td className="py-3 px-space-sm">
                    <span
                      className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm font-semibold ${
                        c.isPublished ? "bg-tertiary-fixed/40 text-on-tertiary-fixed-variant" : "bg-surface-container-high text-secondary"
                      }`}
                    >
                      {c.isPublished ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="py-3 px-space-sm text-secondary">{c.updatedAt.toLocaleDateString("en-US")}</td>
                </tr>
              ))}
              {courses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-secondary">
                    No courses yet — create your first one.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
