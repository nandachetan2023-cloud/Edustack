"use client";

import { useState, useTransition } from "react";
import { createWebhook, toggleWebhookActive, deleteWebhook, testWebhook } from "@/app/(dashboard)/api-webhooks/actions";
import type { WebhookEvent } from "@prisma/client";

export type WebhookRow = {
  id: string;
  url: string;
  event: WebhookEvent;
  isActive: boolean;
  lastTriggeredAt: string | null;
  lastStatus: string | null;
};

const EVENT_LABEL: Record<WebhookEvent, string> = {
  USER_CREATED: "User Created",
  COURSE_PUBLISHED: "Course Published",
};

export function WebhooksPanel({ initialWebhooks }: { initialWebhooks: WebhookRow[] }) {
  const [hooks, setHooks] = useState(initialWebhooks);
  const [url, setUrl] = useState("");
  const [event, setEvent] = useState<WebhookEvent>("USER_CREATED");
  const [error, setError] = useState<string | null>(null);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function create() {
    setError(null);
    startTransition(async () => {
      const result = await createWebhook(url, event);
      if (!result.ok) {
        setError(result.error ?? "Could not create webhook.");
        return;
      }
      setRevealedSecret(result.secret ?? null);
      setHooks((prev) => [{ id: `temp-${Date.now()}`, url, event, isActive: true, lastTriggeredAt: null, lastStatus: null }, ...prev]);
      setUrl("");
    });
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col gap-space-md">
      <div>
        <span className="font-title-md text-title-md text-on-surface font-bold">Webhooks</span>
        <p className="font-caption text-caption text-secondary">Real HTTP POST delivery — fires when these events actually happen in this app, HMAC-signed.</p>
      </div>
      {error ? <p className="font-caption text-caption text-error">{error}</p> : null}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <input
          className="flex-1 h-10 px-3 rounded-lg bg-surface-container-low text-on-surface text-body-sm focus:outline-none"
          placeholder="https://your-endpoint.example.com/webhook"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <select className="h-10 px-3 rounded-lg bg-surface-container-low text-on-surface text-body-sm focus:outline-none" value={event} onChange={(e) => setEvent(e.target.value as WebhookEvent)}>
          {Object.entries(EVENT_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          className="h-10 px-4 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-label-md text-label-md flex items-center justify-center gap-1.5 disabled:opacity-60 shrink-0"
          onClick={create}
          disabled={isPending || !url.trim()}
          type="button"
        >
          <span className="material-symbols-outlined text-lg">add_link</span>
          Add Webhook
        </button>
      </div>

      {revealedSecret ? (
        <div className="p-3 rounded-lg bg-tertiary-fixed/20 border border-tertiary-fixed flex flex-col gap-2">
          <span className="font-label-sm text-label-sm text-on-surface font-semibold">Signing secret — verify payloads with HMAC-SHA256, header X-EduStack-Signature:</span>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-2 py-1.5 rounded bg-surface-container-lowest font-mono text-caption text-caption text-on-surface truncate">{revealedSecret}</code>
            <button className="px-2.5 py-1.5 rounded bg-surface-container text-on-surface hover:bg-surface-container-high font-caption text-caption font-semibold" onClick={() => navigator.clipboard?.writeText(revealedSecret)} type="button">
              Copy
            </button>
            <button className="px-2.5 py-1.5 rounded bg-surface-container text-on-surface hover:bg-surface-container-high font-caption text-caption font-semibold" onClick={() => setRevealedSecret(null)} type="button">
              Done
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col divide-y divide-surface-container-low">
        {hooks.length === 0 ? <p className="font-body-sm text-body-sm text-secondary py-4 text-center">No webhooks registered yet.</p> : null}
        {hooks.map((h) => (
          <WebhookRowItem
            key={h.id}
            hook={h}
            onToggled={(isActive) => setHooks((prev) => prev.map((r) => (r.id === h.id ? { ...r, isActive } : r)))}
            onDeleted={() => setHooks((prev) => prev.filter((r) => r.id !== h.id))}
            onTested={(status) => setHooks((prev) => prev.map((r) => (r.id === h.id ? { ...r, lastStatus: status, lastTriggeredAt: new Date().toISOString() } : r)))}
          />
        ))}
      </div>
    </div>
  );
}

function WebhookRowItem({
  hook,
  onToggled,
  onDeleted,
  onTested,
}: {
  hook: WebhookRow;
  onToggled: (isActive: boolean) => void;
  onDeleted: () => void;
  onTested: (status: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [testing, setTesting] = useState(false);

  return (
    <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-label-md text-label-md text-on-surface font-semibold truncate">{hook.url}</span>
          <span className="px-2 py-0.5 rounded bg-surface-container-high text-secondary font-caption text-caption font-semibold shrink-0">{EVENT_LABEL[hook.event]}</span>
          {!hook.isActive ? <span className="px-2 py-0.5 rounded bg-error-container text-on-error-container font-caption text-caption font-semibold shrink-0">Paused</span> : null}
        </div>
        <span className="font-caption text-caption text-secondary">
          {hook.lastTriggeredAt ? `Last delivery: ${new Date(hook.lastTriggeredAt).toLocaleString("en-US")} · ${hook.lastStatus}` : "Never triggered"}
        </span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          className="h-8 px-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-sm text-label-sm disabled:opacity-50"
          disabled={testing}
          onClick={() => {
            setTesting(true);
            startTransition(async () => {
              const result = await testWebhook(hook.id);
              onTested(result.status ?? "Unknown");
              setTesting(false);
            });
          }}
          type="button"
        >
          {testing ? "Sending…" : "Test"}
        </button>
        <button
          className="h-8 px-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-sm text-label-sm disabled:opacity-50"
          disabled={isPending}
          onClick={() => {
            onToggled(!hook.isActive);
            startTransition(async () => {
              await toggleWebhookActive(hook.id);
            });
          }}
          type="button"
        >
          {hook.isActive ? "Pause" : "Resume"}
        </button>
        <button
          className="w-8 h-8 rounded-lg bg-surface-container-low hover:bg-error-container hover:text-on-error-container text-secondary flex items-center justify-center disabled:opacity-50"
          disabled={isPending}
          onClick={() => {
            onDeleted();
            startTransition(async () => {
              await deleteWebhook(hook.id);
            });
          }}
          type="button"
        >
          <span className="material-symbols-outlined text-base">delete</span>
        </button>
      </div>
    </div>
  );
}
