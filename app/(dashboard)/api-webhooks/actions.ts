"use server";

import { randomBytes, createHmac } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/context";
import { generateApiKey } from "@/lib/api-keys";
import type { WebhookEvent } from "@prisma/client";

export async function createApiKey(name: string) {
  const admin = await requireAdmin();
  const { plaintext, keyPrefix, keyHash } = generateApiKey();

  await prisma.apiKey.create({
    data: { tenantId: admin.tenant.id, name: name.trim() || "Untitled Key", keyPrefix, keyHash },
  });

  revalidatePath("/api-webhooks");
  return { ok: true, plaintext };
}

export async function revokeApiKey(id: string) {
  await requireAdmin();
  await prisma.apiKey.update({ where: { id }, data: { revoked: true } });
  revalidatePath("/api-webhooks");
  return { ok: true };
}

export async function createWebhook(url: string, event: WebhookEvent) {
  const admin = await requireAdmin();
  try {
    new URL(url);
  } catch {
    return { ok: false, error: "That doesn't look like a valid URL." };
  }
  const secret = `whsec_${randomBytes(18).toString("base64url")}`;
  await prisma.webhook.create({ data: { tenantId: admin.tenant.id, url, event, secret } });
  revalidatePath("/api-webhooks");
  return { ok: true, secret };
}

export async function toggleWebhookActive(id: string) {
  await requireAdmin();
  const hook = await prisma.webhook.findUniqueOrThrow({ where: { id } });
  await prisma.webhook.update({ where: { id }, data: { isActive: !hook.isActive } });
  revalidatePath("/api-webhooks");
  return { ok: true };
}

export async function deleteWebhook(id: string) {
  await requireAdmin();
  await prisma.webhook.delete({ where: { id } });
  revalidatePath("/api-webhooks");
  return { ok: true };
}

export async function testWebhook(id: string) {
  await requireAdmin();
  const hook = await prisma.webhook.findUniqueOrThrow({ where: { id } });
  const body = JSON.stringify({ event: "TEST_PING", data: { message: "Hello from EduStack — this is a test delivery." }, timestamp: new Date().toISOString() });
  const signature = createHmac("sha256", hook.secret).update(body).digest("hex");

  let status: string;
  try {
    const res = await fetch(hook.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-EduStack-Signature": signature },
      body,
      signal: AbortSignal.timeout(8000),
    });
    status = `${res.status} ${res.ok ? "OK" : "Error"}`;
  } catch (err) {
    status = `Failed: ${err instanceof Error ? err.message : "Unknown error"}`;
  }

  await prisma.webhook.update({ where: { id }, data: { lastTriggeredAt: new Date(), lastStatus: status } });
  revalidatePath("/api-webhooks");
  return { ok: true, status };
}
