"use client";

import { useState, useTransition } from "react";
import { registerForSession } from "@/app/(dashboard)/my-learning/actions";
import { buildIcsFile, downloadIcsFile } from "@/lib/ics";

type SessionActionsProps = {
  sessionId: string;
  title: string;
  description: string;
  startsAt: string;
  alreadyRegistered: boolean;
};

export function SessionActions({ sessionId, title, description, startsAt, alreadyRegistered }: SessionActionsProps) {
  const [registered, setRegistered] = useState(alreadyRegistered);
  const [isPending, startTransition] = useTransition();

  function rsvp() {
    if (registered) return;
    setRegistered(true);
    startTransition(async () => {
      await registerForSession(sessionId);
    });
  }

  function addToCalendar() {
    const ics = buildIcsFile({ uid: sessionId, title, description, startsAt: new Date(startsAt), durationMinutes: 60 });
    downloadIcsFile(`${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.ics`, ics);
  }

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <button
        className="px-2 py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-caption text-caption shrink-0 transition-colors"
        onClick={addToCalendar}
        type="button"
      >
        + Cal
      </button>
      <button
        className={`font-label-sm text-label-sm font-semibold flex items-center gap-0.5 shrink-0 transition-colors ${
          registered ? "text-tertiary" : "text-primary hover:underline"
        }`}
        onClick={rsvp}
        disabled={registered || isPending}
        type="button"
      >
        {registered ? (
          <>
            Registered <span className="material-symbols-outlined text-xs">check_circle</span>
          </>
        ) : (
          <>
            RSVP <span className="material-symbols-outlined text-xs">arrow_forward</span>
          </>
        )}
      </button>
    </div>
  );
}
