"use client";

import { useState, useTransition } from "react";
import { updateSeatLimit } from "@/app/(dashboard)/organization-settings/actions";

export function SeatLimitEditor({ initialLimit, seatsUsed }: { initialLimit: number; seatsUsed: number }) {
  const [limit, setLimit] = useState(initialLimit);
  const [saveState, setSaveState] = useState<"idle" | "saved">("idle");
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      await updateSeatLimit(limit);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1500);
    });
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col gap-space-sm">
      <span className="font-title-md text-title-md text-on-surface font-bold">Enterprise Seat Limit</span>
      <p className="font-caption text-caption text-secondary">{seatsUsed.toLocaleString("en-US")} seats currently provisioned.</p>
      <div className="flex items-center gap-2">
        <input
          className="w-32 h-10 px-3 rounded-lg bg-surface-container-low text-on-surface text-body-sm focus:outline-none"
          type="number"
          min={seatsUsed}
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
        />
        <button
          className="h-10 px-4 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-label-md text-label-md disabled:opacity-60 flex items-center gap-1.5"
          onClick={save}
          disabled={isPending || limit === initialLimit}
          type="button"
        >
          <span className="material-symbols-outlined text-lg">{saveState === "saved" ? "check" : "save"}</span>
          {saveState === "saved" ? "Saved" : "Save"}
        </button>
      </div>
    </div>
  );
}
