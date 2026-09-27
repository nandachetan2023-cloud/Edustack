import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApiRequest } from "@/lib/api-auth";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (auth.error) return auth.error;

  const learners = await prisma.user.findMany({
    where: { tenantId: auth.tenant.id, role: "LEARNER" },
    include: { department: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    data: learners.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      department: u.department?.name ?? null,
      isActive: u.isActive,
      ceuCredits: u.ceuCredits,
    })),
  });
}
