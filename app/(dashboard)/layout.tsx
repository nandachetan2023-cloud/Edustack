import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/context";
import { dueInDays } from "@/lib/format";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import type { NotificationItem } from "@/components/dashboard/header";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const tenant = user.tenant;
  const seatsUsed = await prisma.user.count({ where: { tenantId: tenant.id } });

  const [overdueEnrollments, upcomingSessions] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId: user.id, status: "OVERDUE" },
      include: { course: true },
      take: 5,
    }),
    prisma.liveSession.findMany({
      where: { tenantId: tenant.id, startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      take: 3,
    }),
  ]);

  const notifications: NotificationItem[] = [
    ...overdueEnrollments.map((e) => ({
      id: `overdue-${e.id}`,
      title: `${e.course.title} is overdue`,
      subtitle: e.course.dueDate ? `Was due ${Math.abs(dueInDays(e.course.dueDate) ?? 0)} days ago` : "Complete this mandatory course now",
      icon: "warning",
      tone: "error" as const,
    })),
    ...upcomingSessions.map((s) => ({
      id: `session-${s.id}`,
      title: s.title,
      subtitle: `${s.startsAt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} • ${s.startsAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`,
      icon: "event",
      tone: "primary" as const,
    })),
  ];

  return (
    <DashboardShell
      tenantName={tenant.name}
      tenantDomain={tenant.domain}
      seatsUsed={seatsUsed}
      seatLimit={tenant.seatLimit}
      userName={user.name}
      userRole={user.role}
      userTitle={user.jobTitle ?? (user.role === "LEARNER" ? "Learner" : "Admin")}
      notifications={notifications}
    >
      {children}
    </DashboardShell>
  );
}
