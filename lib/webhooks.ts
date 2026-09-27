import { createHmac } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { WebhookEvent } from "@prisma/client";

export async function triggerWebhooks(tenantId: string, event: WebhookEvent, payload: Record<string, unknown>) {
  const webhooks = await prisma.webhook.findMany({ where: { tenantId, event, isActive: true } });
  await Promise.all(webhooks.map((hook) => deliver(hook.id, hook.url, hook.secret, event, payload)));
}

async function deliver(webhookId: string, url: string, secret: string, event: WebhookEvent, payload: Record<string, unknown>) {
  const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() });
  const signature = createHmac("sha256", secret).update(body).digest("hex");

  let status: string;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-EduStack-Signature": signature },
      body,
      signal: AbortSignal.timeout(8000),
    });
    status = `${res.status} ${res.ok ? "OK" : "Error"}`;
  } catch (err) {
    status = `Failed: ${err instanceof Error ? err.message : "Unknown error"}`;
  }

  await prisma.webhook.update({
    where: { id: webhookId },
    data: { lastTriggeredAt: new Date(), lastStatus: status },
  });
}
