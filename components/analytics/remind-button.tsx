"use client";

import { useState, useTransition } from "react";
import { remindOverdueLearners } from "@/app/(dashboard)/analytics-compliance/actions";

export function RemindButton({ courseId, overdueCount }: { courseId: string; overdueCount: number }) {
  const [state, setState] = useState<"idle" | "sent" | "recorded">("idle");
  const [isPending, startTransition] = useTransition();

  function send() {
    startTransition(async () => {
      const result = await remindOverdueLearners(courseId);
      setState(result.slackSent ? "sent" : "recorded");
      setTimeout(() => setState("idle"), 4000);
    });
  }

  return (
    <button
      className={`h-11 px-space-md rounded-lg font-label-md text-label-md flex items-center gap-2 transition-colors disabled:opacity-60 ${
        state !== "idle" ? "bg-tertiary-fixed/30 text-on-tertiary-fixed-variant" : "bg-surface-container-high hover:bg-surface-container text-on-surface"
      }`}
      onClick={send}
      disabled={isPending || overdueCount === 0}
      type="button"
      title={state === "recorded" ? "No Slack webhook configured — logged the reminder in the database instead" : undefined}
    >
      {state === "sent" ? (
        <>
          <span className="material-symbols-outlined text-tertiary text-lg">check</span>
          <span>Sent via Slack!</span>
        </>
      ) : state === "recorded" ? (
        <>
          <span className="material-symbols-outlined text-lg">info</span>
          <span>Recorded (no Slack configured)</span>
        </>
      ) : (
        <>
          <span className="material-symbols-outlined text-primary text-lg">forward_to_inbox</span>
          <span>{isPending ? "Sending…" : `Remind Overdue (${overdueCount})`}</span>
        </>
      )}
    </button>
  );
}
