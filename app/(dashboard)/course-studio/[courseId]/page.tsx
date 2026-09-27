import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/context";
import { CourseMetaForm } from "@/components/course-studio/course-meta-form";
import { CurriculumBuilder } from "@/components/course-studio/curriculum-builder";

export const dynamic = "force-dynamic";

export default async function CourseEditorPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const admin = await requireAdmin();
  const tenant = admin.tenant;

  const [course, instructors] = await Promise.all([
    prisma.course.findFirst({
      where: { id: courseId, tenantId: tenant.id },
      include: { modules: { include: { lessons: { orderBy: { order: "asc" } } }, orderBy: { order: "asc" } }, instructor: true },
    }),
    prisma.instructor.findMany({ where: { tenantId: tenant.id }, orderBy: { name: "asc" } }),
  ]);

  if (!course) notFound();

  return (
    <div className="flex flex-col w-full">
      <div className="px-space-sm sm:px-space-lg lg:px-space-xl py-space-lg flex flex-col gap-space-lg max-w-[1600px] mx-auto w-full">
        <div className="flex items-center gap-2">
          <Link href="/course-studio" className="w-9 h-9 rounded-lg bg-surface-container-lowest hover:bg-surface-container-low flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </Link>
          <div className="flex flex-col">
            <span className="font-caption text-caption text-secondary uppercase tracking-widest">Course Studio</span>
            <h1 className="font-headline-sm text-headline-sm text-on-surface font-bold">{course.title}</h1>
          </div>
          <span
            className={`ml-2 px-2.5 py-1 rounded-full font-label-sm text-label-sm font-semibold ${
              course.isPublished ? "bg-tertiary-fixed/40 text-on-tertiary-fixed-variant" : "bg-surface-container-high text-secondary"
            }`}
          >
            {course.isPublished ? "Published" : "Draft"}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
          <div className="lg:col-span-5">
            <CourseMetaForm
              course={{
                id: course.id,
                title: course.title,
                description: course.description,
                category: course.category,
                difficulty: course.difficulty,
                ceuCredits: course.ceuCredits,
                durationHours: course.durationHours,
                instructorId: course.instructorId,
                isMandatory: course.isMandatory,
                isCohort: course.isCohort,
                isPublished: course.isPublished,
              }}
              instructors={instructors.map((i) => ({ id: i.id, name: i.name }))}
            />
          </div>
          <div className="lg:col-span-7">
            <CurriculumBuilder
              courseId={course.id}
              modules={course.modules.map((m) => ({
                id: m.id,
                title: m.title,
                order: m.order,
                lessons: m.lessons.map((l) => ({
                  id: l.id,
                  title: l.title,
                  order: l.order,
                  type: l.type,
                  durationMinutes: l.durationMinutes,
                  content: l.content,
                  videoUrl: l.videoUrl,
                })),
              }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
