"use server";

import { prisma } from "@/lib/prisma";
import { getDemoTenant } from "@/lib/context";

export type SearchResult = {
  id: string;
  type: "course" | "learner" | "instructor";
  title: string;
  subtitle: string;
  href: string;
};

export async function globalSearch(query: string): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const tenant = await getDemoTenant();

  const [courses, learners, instructors] = await Promise.all([
    prisma.course.findMany({
      where: { tenantId: tenant.id, title: { contains: trimmed, mode: "insensitive" } },
      take: 5,
    }),
    prisma.user.findMany({
      where: {
        tenantId: tenant.id,
        role: "LEARNER",
        OR: [{ name: { contains: trimmed, mode: "insensitive" } }, { email: { contains: trimmed, mode: "insensitive" } }],
      },
      include: { department: true },
      take: 5,
    }),
    prisma.instructor.findMany({
      where: { tenantId: tenant.id, name: { contains: trimmed, mode: "insensitive" } },
      take: 5,
    }),
  ]);

  return [
    ...courses.map((c) => ({
      id: c.id,
      type: "course" as const,
      title: c.title,
      subtitle: `${c.category} • Course Catalog`,
      href: "/course-catalog",
    })),
    ...learners.map((u) => ({
      id: u.id,
      type: "learner" as const,
      title: u.name,
      subtitle: `${u.department?.name ?? "Unassigned"} • Learner`,
      href: "/analytics-compliance",
    })),
    ...instructors.map((i) => ({
      id: i.id,
      type: "instructor" as const,
      title: i.name,
      subtitle: `${i.title ?? "Instructor"} • Faculty`,
      href: "/course-catalog",
    })),
  ];
}
