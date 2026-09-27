"use client";

import { useState, useTransition } from "react";
import { createApiKey, revokeApiKey } from "@/app/(dashboard)/api-webhooks/actions";

export type ApiKeyRow = { id: string; name: string; keyPrefix: string; revoked: boolean; createdAt: string; lastUsedAt: string | null };

export function ApiKeysPanel({ initialKeys }: { initialKeys: ApiKeyRow[] }) {
  const [keys, setKeys] = useState(initialKeys);
  const [name, setName] = useState("");
  const [revealed, setRevealed] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function create() {
    if (!name.trim()) return;
    startTransition(async () => {
      const result = await createApiKey(name);
      if (result.ok && result.plaintext) {
        setRevealed(result.plaintext);
        setKeys((prev) => [
          { id: `temp-${Date.now()}`, name, keyPrefix: result.plaintext!.slice(0, 14), revoked: false, createdAt: new Date().toISOString(), lastUsedAt: null },
          ...prev,
        ]);
        setName("");
      }
    });
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col gap-space-md">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-title-md text-title-md text-on-surface font-bold">API Keys</span>
          <p className="font-caption text-caption text-secondary">Authenticate requests to the EduStack REST API with a Bearer token.</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          className="flex-1 h-10 px-3 rounded-lg bg-surface-container-low text-on-surface text-body-sm focus:outline-none"
          placeholder="Key name (e.g. Zapier integration)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          className="h-10 px-4 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-label-md text-label-md flex items-center gap-1.5 disabled:opacity-60"
          onClick={create}
          disabled={isPending || !name.trim()}
          type="button"
        >
          <span className="material-symbols-outlined text-lg">key</span>
          Generate Key
        </button>
      </div>

      {revealed ? (
        <div className="p-3 rounded-lg bg-tertiary-fixed/20 border border-tertiary-fixed flex flex-col gap-2">
          <span className="font-label-sm text-label-sm text-on-surface font-semibold">
            Copy this now — it won&apos;t be shown again (only a hash is stored):
          </span>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-2 py-1.5 rounded bg-surface-container-lowest font-mono text-caption text-caption text-on-surface truncate">{revealed}</code>
            <button
              className="px-2.5 py-1.5 rounded bg-surface-container text-on-surface hover:bg-surface-container-high font-caption text-caption font-semibold"
              onClick={() => navigator.clipboard?.writeText(revealed)}
              type="button"
            >
              Copy
            </button>
            <button className="px-2.5 py-1.5 rounded bg-surface-container text-on-surface hover:bg-surface-container-high font-caption text-caption font-semibold" onClick={() => setRevealed(null)} type="button">
              Done
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col divide-y divide-surface-container-low">
        {keys.length === 0 ? <p className="font-body-sm text-body-sm text-secondary py-4 text-center">No API keys yet.</p> : null}
        {keys.map((k) => (
          <ApiKeyRowItem key={k.id} apiKey={k} onRevoked={() => setKeys((prev) => prev.map((r) => (r.id === k.id ? { ...r, revoked: true } : r)))} />
        ))}
      </div>
    </div>
  );
}

function ApiKeyRowItem({ apiKey, onRevoked }: { apiKey: ApiKeyRow; onRevoked: () => void }) {
  const [isPending, startTransition] = useTransition();
  return (
    <div className="py-3 flex items-center justify-between gap-3">
      <div className="flex flex-col min-w-0">
        <span className="font-label-md text-label-md text-on-surface font-semibold truncate">{apiKey.name}</span>
        <span className="font-mono font-caption text-caption text-secondary truncate">
          {apiKey.keyPrefix}••••••••{apiKey.lastUsedAt ? ` · last used ${new Date(apiKey.lastUsedAt).toLocaleDateString("en-US")}` : " · never used"}
        </span>
      </div>
      {apiKey.revoked ? (
        <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-secondary font-caption text-caption font-semibold shrink-0">Revoked</span>
      ) : (
        <button
          className="h-8 px-2.5 rounded-lg bg-error-container text-on-error-container hover:bg-error hover:text-on-error font-label-sm text-label-sm transition-colors disabled:opacity-50 shrink-0"
          disabled={isPending}
          onClick={() => {
            onRevoked();
            startTransition(async () => {
              await revokeApiKey(apiKey.id);
            });
          }}
          type="button"
        >
          Revoke
        </button>
      )}
    </div>
  );
}
