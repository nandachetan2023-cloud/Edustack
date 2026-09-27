"use client";

import { useTransition } from "react";
import { createDraftCourse } from "@/app/(dashboard)/course-studio/actions";

export function NewCourseButton({
  isCohort = false,
  label,
  className,
}: {
  isCohort?: boolean;
  label?: string;
  className?: string;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      className={
        className ??
        "h-10 px-space-md rounded-lg bg-primary text-on-primary hover:bg-primary/90 font-label-md text-label-md flex items-center gap-2 transition-all shadow-md shrink-0 disabled:opacity-60"
      }
      onClick={() => startTransition(() => createDraftCourse({ isCohort }))}
      disabled={isPending}
      type="button"
    >
      <span className="material-symbols-outlined text-lg">add_circle</span>
      {isPending ? "Creating…" : (label ?? (isCohort ? "Create Cohort" : "New Course"))}
    </button>
  );
}
