import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApiRequest } from "@/lib/api-auth";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (auth.error) return auth.error;

  const courses = await prisma.course.findMany({
    where: { tenantId: auth.tenant.id, isPublished: true },
    include: { instructor: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    data: courses.map((c) => ({
      id: c.id,
      title: c.title,
      category: c.category,
      difficulty: c.difficulty,
      ceuCredits: c.ceuCredits,
      durationHours: c.durationHours,
      instructor: c.instructor?.name ?? null,
      isCohort: c.isCohort,
      isMandatory: c.isMandatory,
    })),
  });
}
