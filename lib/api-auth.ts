import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashApiKey } from "@/lib/api-keys";

export async function authenticateApiRequest(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return { error: NextResponse.json({ error: "Missing Authorization: Bearer <key> header." }, { status: 401 }) };
  }

  const keyHash = hashApiKey(match[1]);
  const apiKey = await prisma.apiKey.findFirst({ where: { keyHash, revoked: false }, include: { tenant: true } });
  if (!apiKey) {
    return { error: NextResponse.json({ error: "Invalid or revoked API key." }, { status: 401 }) };
  }

  await prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });

  return { tenant: apiKey.tenant };
}
