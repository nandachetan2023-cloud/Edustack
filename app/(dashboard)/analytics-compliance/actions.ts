"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { sendSlackReminder, isSlackConfigured } from "@/lib/notifications";

export async function remindOverdueLearners(courseId: string) {
  const overdue = await prisma.enrollment.findMany({
    where: { courseId, status: "OVERDUE" },
    include: { user: true, course: true },
  });

  if (overdue.length === 0) {
    return { ok: true, remindedCount: 0, slackSent: false, slackConfigured: isSlackConfigured() };
  }

  const courseTitle = overdue[0].course.title;
  const names = overdue.map((e) => e.user.name).join(", ");
  const message = `⚠️ Compliance reminder: ${overdue.length} learner(s) overdue on "${courseTitle}" — ${names}`;

  const result = await sendSlackReminder(message);

  await prisma.enrollment.updateMany({
    where: { id: { in: overdue.map((e) => e.id) } },
    data: { remindedAt: new Date() },
  });

  revalidatePath("/analytics-compliance");
  return { ok: true, remindedCount: overdue.length, slackSent: result.sent, slackConfigured: isSlackConfigured(), reason: result.reason };
}

export async function nudgeLearner(enrollmentId: string) {
  const enrollment = await prisma.enrollment.findUniqueOrThrow({
    where: { id: enrollmentId },
    include: { user: true, course: true },
  });

  const message = `👋 Nudge: ${enrollment.user.name} is overdue on "${enrollment.course.title}" (${Math.round(enrollment.progressPercent)}% complete).`;
  const result = await sendSlackReminder(message);

  await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: { remindedAt: new Date() },
  });

  revalidatePath("/analytics-compliance");
  return { ok: true, slackSent: result.sent, slackConfigured: isSlackConfigured(), reason: result.reason };
}
