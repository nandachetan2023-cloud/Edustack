"use client";

import { useState } from "react";
import Link from "next/link";

type Dept = { id: string; name: string; learnerCount: number };

export function DepartmentSwitcher({ departments, selectedLabel, totalLearners }: { departments: Dept[]; selectedLabel: string; totalLearners: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block text-left">
      <button
        className="h-9 px-space-sm bg-surface-container-low hover:bg-surface-container rounded-lg font-label-md text-label-md text-on-surface flex items-center gap-2 transition-colors shadow-sm"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <span className="material-symbols-outlined text-primary text-base">corporate_fare</span>
        <span>{selectedLabel}</span>
        <span className="material-symbols-outlined text-secondary text-base">expand_more</span>
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute left-0 mt-1.5 w-64 rounded-xl bg-surface-container-lowest shadow-xl z-30 p-1.5 flex flex-col gap-0.5">
            <Link
              href="/analytics-compliance"
              onClick={() => setOpen(false)}
              className="w-full text-left px-space-sm py-2 rounded-lg font-label-md text-label-md hover:bg-surface-container-low text-primary font-semibold flex items-center justify-between"
            >
              <span>All Organization ({totalLearners})</span>
            </Link>
            <div className="h-px bg-surface-container-high my-1" />
            {departments.map((d) => (
              <Link
                key={d.id}
                href={`/analytics-compliance?dept=${d.id}`}
                onClick={() => setOpen(false)}
                className="w-full text-left px-space-sm py-2 rounded-lg font-label-md text-label-md hover:bg-surface-container-low text-on-surface flex items-center justify-between"
              >
                <span>
                  {d.name} ({d.learnerCount})
                </span>
              </Link>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
