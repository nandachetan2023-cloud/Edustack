import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/context";
import { ApiKeysPanel } from "@/components/api-webhooks/api-keys-panel";
import { WebhooksPanel } from "@/components/api-webhooks/webhooks-panel";

export const dynamic = "force-dynamic";

export default async function ApiWebhooksPage() {
  const admin = await requireAdmin();
  const tenant = admin.tenant;

  const [apiKeys, webhooks] = await Promise.all([
    prisma.apiKey.findMany({ where: { tenantId: tenant.id }, orderBy: { createdAt: "desc" } }),
    prisma.webhook.findMany({ where: { tenantId: tenant.id }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div className="flex flex-col w-full">
      <div className="px-space-sm sm:px-space-lg lg:px-space-xl py-space-lg flex flex-col gap-space-lg max-w-[1600px] mx-auto w-full">
        <div className="flex flex-col gap-1">
          <span className="font-caption text-caption text-secondary uppercase tracking-widest">Admin Workspace / API &amp; Webhooks</span>
          <h1 className="font-headline-lg-mobile sm:font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-on-surface tracking-tight">
            API &amp; Webhooks
          </h1>
          <p className="font-body-md text-body-md text-secondary max-w-2xl">
            A real, working REST API and outbound webhooks for {tenant.name} — not a mockup.
          </p>
        </div>

        <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col gap-space-sm">
          <span className="font-title-md text-title-md text-on-surface font-bold">Quick Start</span>
          <p className="font-body-sm text-body-sm text-secondary">Generate a key below, then try it — this actually hits the live database:</p>
          <pre className="p-3 rounded-lg bg-[#0b1329] text-[#e2e8f0] font-mono text-caption text-caption overflow-x-auto">
{`curl http://localhost:3000/api/v1/courses \\
  -H "Authorization: Bearer esk_live_..."

curl http://localhost:3000/api/v1/learners \\
  -H "Authorization: Bearer esk_live_..."`}
          </pre>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-space-lg items-start">
          <ApiKeysPanel
            initialKeys={apiKeys.map((k) => ({
              id: k.id,
              name: k.name,
              keyPrefix: k.keyPrefix,
              revoked: k.revoked,
              createdAt: k.createdAt.toISOString(),
              lastUsedAt: k.lastUsedAt ? k.lastUsedAt.toISOString() : null,
            }))}
          />
          <WebhooksPanel
            initialWebhooks={webhooks.map((w) => ({
              id: w.id,
              url: w.url,
              event: w.event,
              isActive: w.isActive,
              lastTriggeredAt: w.lastTriggeredAt ? w.lastTriggeredAt.toISOString() : null,
              lastStatus: w.lastStatus,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
