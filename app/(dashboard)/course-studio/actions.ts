"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/context";
import { triggerWebhooks } from "@/lib/webhooks";
import type { Difficulty, LessonType } from "@prisma/client";

export async function createDraftCourse(options?: { isCohort?: boolean }) {
  const admin = await requireAdmin();
  const course = await prisma.course.create({
    data: {
      tenantId: admin.tenant.id,
      title: options?.isCohort ? "Untitled Cohort Track" : "Untitled Course",
      description: "",
      category: "General",
      difficulty: "INTERMEDIATE",
      isCohort: options?.isCohort ?? false,
      isPublished: false,
    },
  });
  revalidatePath("/course-studio");
  revalidatePath("/course-catalog");
  redirect(`/course-studio/${course.id}`);
}

export async function deleteCourse(courseId: string) {
  await requireAdmin();
  await prisma.course.delete({ where: { id: courseId } });
  revalidatePath("/course-studio");
  revalidatePath("/course-catalog");
  redirect("/course-studio");
}

export type CourseMetaInput = {
  title: string;
  description: string;
  category: string;
  difficulty: Difficulty;
  ceuCredits: number;
  durationHours: number;
  instructorId: string | null;
  isMandatory: boolean;
  isCohort: boolean;
  isPublished: boolean;
};

export async function updateCourseMeta(courseId: string, input: CourseMetaInput) {
  await requireAdmin();
  const before = await prisma.course.findUniqueOrThrow({ where: { id: courseId } });

  const updated = await prisma.course.update({
    where: { id: courseId },
    data: {
      title: input.title.trim() || "Untitled Course",
      description: input.description,
      category: input.category.trim() || "General",
      difficulty: input.difficulty,
      ceuCredits: input.ceuCredits,
      durationHours: input.durationHours,
      instructorId: input.instructorId,
      isMandatory: input.isMandatory,
      isCohort: input.isCohort,
      isPublished: input.isPublished,
    },
  });

  if (!before.isPublished && updated.isPublished) {
    await triggerWebhooks(updated.tenantId, "COURSE_PUBLISHED", { id: updated.id, title: updated.title, category: updated.category });
  }

  revalidatePath(`/course-studio/${courseId}`);
  revalidatePath("/course-studio");
  revalidatePath("/course-catalog");
  return { ok: true };
}

export async function addModule(courseId: string, title: string) {
  await requireAdmin();
  const count = await prisma.module.count({ where: { courseId } });
  await prisma.module.create({ data: { courseId, title: title.trim() || "New Module", order: count + 1 } });
  revalidatePath(`/course-studio/${courseId}`);
  return { ok: true };
}

export async function renameModule(moduleId: string, title: string) {
  await requireAdmin();
  await prisma.module.update({ where: { id: moduleId }, data: { title: title.trim() || "Untitled Module" } });
  const mod = await prisma.module.findUniqueOrThrow({ where: { id: moduleId } });
  revalidatePath(`/course-studio/${mod.courseId}`);
  return { ok: true };
}

export async function deleteModule(moduleId: string) {
  await requireAdmin();
  const mod = await prisma.module.findUniqueOrThrow({ where: { id: moduleId } });
  await prisma.module.delete({ where: { id: moduleId } });
  revalidatePath(`/course-studio/${mod.courseId}`);
  return { ok: true };
}

export async function reorderModule(moduleId: string, direction: "up" | "down") {
  await requireAdmin();
  const mod = await prisma.module.findUniqueOrThrow({ where: { id: moduleId } });
  const neighbor = await prisma.module.findFirst({
    where: { courseId: mod.courseId, order: direction === "up" ? { lt: mod.order } : { gt: mod.order } },
    orderBy: { order: direction === "up" ? "desc" : "asc" },
  });
  if (!neighbor) return { ok: false };
  await prisma.$transaction([
    prisma.module.update({ where: { id: mod.id }, data: { order: neighbor.order } }),
    prisma.module.update({ where: { id: neighbor.id }, data: { order: mod.order } }),
  ]);
  revalidatePath(`/course-studio/${mod.courseId}`);
  return { ok: true };
}

export type LessonInput = { title: string; type: LessonType; durationMinutes: number; content: string };

export async function addLesson(moduleId: string, input: LessonInput) {
  await requireAdmin();
  const count = await prisma.lesson.count({ where: { moduleId } });
  await prisma.lesson.create({
    data: { moduleId, title: input.title.trim() || "New Lesson", type: input.type, durationMinutes: input.durationMinutes, content: input.content, order: count + 1 },
  });
  const mod = await prisma.module.findUniqueOrThrow({ where: { id: moduleId } });
  revalidatePath(`/course-studio/${mod.courseId}`);
  return { ok: true };
}

export async function deleteLesson(lessonId: string) {
  await requireAdmin();
  const lesson = await prisma.lesson.findUniqueOrThrow({ where: { id: lessonId }, include: { module: true } });
  await prisma.lesson.delete({ where: { id: lessonId } });
  revalidatePath(`/course-studio/${lesson.module.courseId}`);
  return { ok: true };
}

const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export async function uploadLessonVideo(lessonId: string, formData: FormData) {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No file provided." };
  if (!ALLOWED_VIDEO_TYPES.has(file.type)) return { ok: false, error: `Unsupported video type: ${file.type || "unknown"}.` };
  if (file.size > MAX_VIDEO_BYTES) return { ok: false, error: "Video is larger than 50MB — this demo stores raw files locally, no transcoding pipeline." };

  const lesson = await prisma.lesson.findUniqueOrThrow({ where: { id: lessonId }, include: { module: true } });
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "mp4";
  const filename = `${lessonId}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "lessons");
  await mkdir(uploadDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, filename), buffer);

  const publicUrl = `/uploads/lessons/${filename}?v=${Date.now()}`;
  await prisma.lesson.update({ where: { id: lessonId }, data: { videoUrl: publicUrl } });
  revalidatePath(`/course-studio/${lesson.module.courseId}`);
  return { ok: true, url: publicUrl };
}
