"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/context";

export async function registerForSession(sessionId: string) {
  const user = await requireUser();

  await prisma.liveSessionRegistration.upsert({
    where: { liveSessionId_userId: { liveSessionId: sessionId, userId: user.id } },
    create: { liveSessionId: sessionId, userId: user.id },
    update: {},
  });

  revalidatePath("/my-learning");
  return { ok: true };
}

export async function toggleSaveCourse(courseId: string) {
  const user = await requireUser();

  const existing = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId } },
  });

  if (existing) {
    await prisma.enrollment.update({ where: { id: existing.id }, data: { isSaved: !existing.isSaved } });
  } else {
    const moduleCount = await prisma.module.count({ where: { courseId } });
    await prisma.enrollment.create({
      data: { userId: user.id, courseId, isSaved: true, status: "NOT_STARTED", totalLessons: moduleCount || 1 },
    });
  }

  revalidatePath("/my-learning");
  revalidatePath("/course-catalog");
  return { ok: true };
}
