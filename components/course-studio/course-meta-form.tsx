"use client";

import { useState, useTransition } from "react";
import { updateCourseMeta, deleteCourse } from "@/app/(dashboard)/course-studio/actions";
import type { Difficulty } from "@prisma/client";

type CourseMetaFormProps = {
  course: {
    id: string;
    title: string;
    description: string;
    category: string;
    difficulty: Difficulty;
    ceuCredits: number;
    durationHours: number;
    instructorId: string | null;
    isMandatory: boolean;
    isCohort: boolean;
    isPublished: boolean;
  };
  instructors: { id: string; name: string }[];
};

const DIFFICULTY_OPTIONS: Difficulty[] = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "ALL_LEVELS"];

export function CourseMetaForm({ course, instructors }: CourseMetaFormProps) {
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description);
  const [category, setCategory] = useState(course.category);
  const [difficulty, setDifficulty] = useState<Difficulty>(course.difficulty);
  const [ceuCredits, setCeuCredits] = useState(course.ceuCredits);
  const [durationHours, setDurationHours] = useState(course.durationHours);
  const [instructorId, setInstructorId] = useState(course.instructorId ?? "");
  const [isMandatory, setIsMandatory] = useState(course.isMandatory);
  const [isCohort, setIsCohort] = useState(course.isCohort);
  const [isPublished, setIsPublished] = useState(course.isPublished);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [isPending, startTransition] = useTransition();

  function save() {
    setSaveState("saving");
    startTransition(async () => {
      await updateCourseMeta(course.id, {
        title,
        description,
        category,
        difficulty,
        ceuCredits,
        durationHours,
        instructorId: instructorId || null,
        isMandatory,
        isCohort,
        isPublished,
      });
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    });
  }

  function remove() {
    if (!confirm(`Delete "${course.title}" permanently? This cannot be undone.`)) return;
    startTransition(async () => {
      await deleteCourse(course.id);
    });
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col gap-space-md sticky top-20">
      <span className="font-title-md text-title-md text-on-surface font-bold">Course Details</span>

      <div className="flex flex-col gap-1">
        <label className="font-label-sm text-label-sm text-on-surface font-semibold">Title</label>
        <input className="h-10 px-3 rounded-lg bg-surface-container-low text-on-surface text-body-sm focus:outline-none" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1">
        <label className="font-label-sm text-label-sm text-on-surface font-semibold">Description</label>
        <textarea
          className="min-h-[80px] px-3 py-2 rounded-lg bg-surface-container-low text-on-surface text-body-sm focus:outline-none resize-y"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="font-label-sm text-label-sm text-on-surface font-semibold">Category</label>
          <input className="h-10 px-3 rounded-lg bg-surface-container-low text-on-surface text-body-sm focus:outline-none" value={category} onChange={(e) => setCategory(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-label-sm text-label-sm text-on-surface font-semibold">Difficulty</label>
          <select className="h-10 px-3 rounded-lg bg-surface-container-low text-on-surface text-body-sm focus:outline-none" value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
            {DIFFICULTY_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="font-label-sm text-label-sm text-on-surface font-semibold">CEU Credits</label>
          <input
            className="h-10 px-3 rounded-lg bg-surface-container-low text-on-surface text-body-sm focus:outline-none"
            type="number"
            step="0.5"
            min="0"
            value={ceuCredits}
            onChange={(e) => setCeuCredits(Number(e.target.value))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-label-sm text-label-sm text-on-surface font-semibold">Duration (hrs)</label>
          <input
            className="h-10 px-3 rounded-lg bg-surface-container-low text-on-surface text-body-sm focus:outline-none"
            type="number"
            step="0.5"
            min="0"
            value={durationHours}
            onChange={(e) => setDurationHours(Number(e.target.value))}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="font-label-sm text-label-sm text-on-surface font-semibold">Instructor</label>
        <select className="h-10 px-3 rounded-lg bg-surface-container-low text-on-surface text-body-sm focus:outline-none" value={instructorId} onChange={(e) => setInstructorId(e.target.value)}>
          <option value="">Unassigned</option>
          {instructors.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <label className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-surface-container-low cursor-pointer">
          <span className="font-label-md text-label-md text-on-surface">Mandatory compliance course</span>
          <input type="checkbox" className="accent-primary w-4 h-4" checked={isMandatory} onChange={(e) => setIsMandatory(e.target.checked)} />
        </label>
        <label className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-surface-container-low cursor-pointer">
          <span className="font-label-md text-label-md text-on-surface">Live cohort track</span>
          <input type="checkbox" className="accent-primary w-4 h-4" checked={isCohort} onChange={(e) => setIsCohort(e.target.checked)} />
        </label>
        <label className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-primary-container/20 cursor-pointer">
          <span className="font-label-md text-label-md text-on-surface font-semibold">Published to catalog</span>
          <input type="checkbox" className="accent-primary w-4 h-4" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
        </label>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-surface-container">
        <button
          className="flex-1 h-10 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-label-md text-label-md flex items-center justify-center gap-2 disabled:opacity-60"
          onClick={save}
          disabled={isPending}
          type="button"
        >
          <span className="material-symbols-outlined text-lg">{saveState === "saved" ? "check_circle" : "save"}</span>
          {saveState === "saved" ? "Saved" : saveState === "saving" ? "Saving…" : "Save Changes"}
        </button>
        <button className="h-10 px-3 rounded-lg bg-error-container text-on-error-container hover:bg-error hover:text-on-error transition-colors" onClick={remove} disabled={isPending} type="button" title="Delete course">
          <span className="material-symbols-outlined text-lg">delete</span>
        </button>
      </div>
    </div>
  );
}
