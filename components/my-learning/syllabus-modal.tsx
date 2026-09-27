"use client";

import { useState } from "react";

type ModuleWithLessons = {
  id: string;
  title: string;
  order: number;
  status: "LOCKED" | "ACTIVE" | "COMPLETED";
};

type SyllabusModalProps = {
  courseTitle: string;
  progressPercent: number;
  modules: ModuleWithLessons[];
};

const STATUS_META: Record<ModuleWithLessons["status"], { icon: string; label: string; className: string }> = {
  COMPLETED: { icon: "check_circle", label: "Completed", className: "bg-surface-container-low" },
  ACTIVE: { icon: "play_circle", label: "Active", className: "bg-primary/10" },
  LOCKED: { icon: "lock", label: "Locked", className: "bg-surface-container-lowest text-secondary" },
};

export function SyllabusModal({ courseTitle, progressPercent, modules }: SyllabusModalProps) {
  const [open, setOpen] = useState(false);
  const activeModule = modules.find((m) => m.status === "ACTIVE");

  return (
    <>
      <button
        className="h-9 px-3 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md flex items-center gap-1.5 transition-colors"
        onClick={() => setOpen(true)}
        type="button"
      >
        <span className="material-symbols-outlined text-base text-secondary">list_alt</span>
        Syllabus
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-surface-container-lowest w-full max-w-xl rounded-xl shadow-xl p-space-lg flex flex-col gap-4 max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col min-w-0">
                <span className="font-caption text-caption text-primary font-semibold uppercase">
                  Course Syllabus Outline
                </span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">{courseTitle}</h3>
              </div>
              <button
                className="w-8 h-8 shrink-0 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface flex items-center justify-center"
                onClick={() => setOpen(false)}
                type="button"
                aria-label="Close"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
            <div className="flex flex-col gap-3 overflow-y-auto pr-1">
              {modules.map((mod, idx) => {
                const meta = STATUS_META[mod.status];
                return (
                  <div key={mod.id} className={`p-3 rounded-lg flex items-center justify-between gap-2 ${meta.className}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`material-symbols-outlined text-lg shrink-0 ${
                          mod.status === "COMPLETED" ? "text-tertiary" : mod.status === "ACTIVE" ? "text-primary" : "text-secondary"
                        }`}
                      >
                        {meta.icon}
                      </span>
                      <span
                        className={`font-label-md text-label-md truncate ${
                          mod.status === "ACTIVE" ? "text-primary font-semibold" : "text-on-surface"
                        }`}
                      >
                        Module {idx + 1}: {mod.title}
                      </span>
                    </div>
                    {mod.status === "ACTIVE" ? (
                      <span className="px-2 py-0.5 rounded bg-primary text-on-primary font-caption text-caption shrink-0">
                        Active ({progressPercent}%)
                      </span>
                    ) : (
                      <span className="font-caption text-caption text-secondary shrink-0">{meta.label}</span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-container">
              <button
                className="h-9 px-4 rounded-lg bg-surface-container-low text-on-surface font-label-md text-label-md"
                onClick={() => setOpen(false)}
                type="button"
              >
                Close
              </button>
              <button
                className="h-9 px-4 rounded-lg bg-primary text-on-primary font-label-md text-label-md flex items-center gap-1.5"
                type="button"
                onClick={() => setOpen(false)}
              >
                <span className="material-symbols-outlined text-base">play_arrow</span>
                {activeModule ? `Resume ${activeModule.title}` : "Resume Course"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
