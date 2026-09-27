"use client";

import { useRef, useState, useTransition } from "react";
import {
  addModule,
  renameModule,
  deleteModule,
  reorderModule,
  addLesson,
  deleteLesson,
  uploadLessonVideo,
  type LessonInput,
} from "@/app/(dashboard)/course-studio/actions";
import type { LessonType } from "@prisma/client";

type Lesson = {
  id: string;
  title: string;
  order: number;
  type: LessonType;
  durationMinutes: number;
  content: string | null;
  videoUrl: string | null;
};

type ModuleData = { id: string; title: string; order: number; lessons: Lesson[] };

const LESSON_TYPE_ICON: Record<LessonType, string> = {
  VIDEO: "smart_display",
  READING: "menu_book",
  CODE_SANDBOX: "terminal",
  QUIZ: "quiz",
};

export function CurriculumBuilder({ courseId, modules }: { courseId: string; modules: ModuleData[] }) {
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col gap-space-md">
      <div className="flex items-center justify-between">
        <span className="font-title-md text-title-md text-on-surface font-bold">Curriculum Builder</span>
        <span className="font-caption text-caption text-secondary">{modules.length} modules</span>
      </div>

      <div className="flex flex-col gap-3">
        {modules.map((mod, idx) => (
          <ModuleCard key={mod.id} courseId={courseId} module={mod} isFirst={idx === 0} isLast={idx === modules.length - 1} />
        ))}
        {modules.length === 0 ? <p className="font-body-sm text-body-sm text-secondary py-4 text-center">No modules yet — add your first one below.</p> : null}
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-surface-container">
        <input
          className="flex-1 h-10 px-3 rounded-lg bg-surface-container-low text-on-surface text-body-sm focus:outline-none"
          placeholder="New module title..."
          value={newModuleTitle}
          onChange={(e) => setNewModuleTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newModuleTitle.trim()) {
              startTransition(async () => {
                await addModule(courseId, newModuleTitle);
                setNewModuleTitle("");
              });
            }
          }}
        />
        <button
          className="h-10 px-4 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-label-md text-label-md flex items-center gap-1.5 disabled:opacity-60"
          disabled={isPending || !newModuleTitle.trim()}
          onClick={() =>
            startTransition(async () => {
              await addModule(courseId, newModuleTitle);
              setNewModuleTitle("");
            })
          }
          type="button"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Add Module
        </button>
      </div>
    </div>
  );
}

function ModuleCard({ courseId, module: mod, isFirst, isLast }: { courseId: string; module: ModuleData; isFirst: boolean; isLast: boolean }) {
  const [title, setTitle] = useState(mod.title);
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="rounded-lg bg-surface-container-low overflow-hidden">
      <div className="flex items-center gap-2 p-3">
        <div className="flex flex-col shrink-0">
          <button className="text-secondary hover:text-on-surface disabled:opacity-30" disabled={isFirst || isPending} onClick={() => startTransition(() => void reorderModule(mod.id, "up"))} type="button">
            <span className="material-symbols-outlined text-base">keyboard_arrow_up</span>
          </button>
          <button className="text-secondary hover:text-on-surface disabled:opacity-30" disabled={isLast || isPending} onClick={() => startTransition(() => void reorderModule(mod.id, "down"))} type="button">
            <span className="material-symbols-outlined text-base">keyboard_arrow_down</span>
          </button>
        </div>
        <button className="text-secondary shrink-0" onClick={() => setExpanded((v) => !v)} type="button">
          <span className="material-symbols-outlined text-lg">{expanded ? "expand_less" : "expand_more"}</span>
        </button>
        <input
          className="flex-1 h-9 px-2 rounded bg-surface-container-lowest text-on-surface font-label-md text-label-md font-semibold focus:outline-none"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            if (title !== mod.title) startTransition(() => void renameModule(mod.id, title));
          }}
        />
        <span className="font-caption text-caption text-secondary shrink-0">{mod.lessons.length} lessons</span>
        <button
          className="w-8 h-8 rounded-lg text-secondary hover:bg-error-container hover:text-on-error-container flex items-center justify-center shrink-0 transition-colors"
          onClick={() => {
            if (confirm(`Delete module "${mod.title}" and all its lessons?`)) startTransition(() => void deleteModule(mod.id));
          }}
          disabled={isPending}
          type="button"
        >
          <span className="material-symbols-outlined text-base">delete</span>
        </button>
      </div>
      {expanded ? (
        <div className="px-3 pb-3 flex flex-col gap-2">
          {mod.lessons.map((lesson) => (
            <LessonRow key={lesson.id} lesson={lesson} />
          ))}
          <AddLessonRow moduleId={mod.id} />
        </div>
      ) : null}
    </div>
  );
}

function LessonRow({ lesson }: { lesson: Lesson }) {
  const [isPending, startTransition] = useTransition();
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "error">("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function upload(file: File) {
    setUploadState("uploading");
    setUploadError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadLessonVideo(lesson.id, formData);
      if (!result.ok) {
        setUploadState("error");
        setUploadError(result.error ?? "Upload failed.");
        return;
      }
      setUploadState("idle");
    });
  }

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-container-lowest">
      <span className="material-symbols-outlined text-secondary text-base shrink-0">{LESSON_TYPE_ICON[lesson.type]}</span>
      <span className="flex-1 font-label-sm text-label-sm text-on-surface truncate">{lesson.title}</span>
      <span className="font-caption text-caption text-secondary shrink-0">{lesson.durationMinutes}min</span>
      {lesson.type === "VIDEO" ? (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload(file);
              e.target.value = "";
            }}
          />
          <button
            className={`px-2 py-1 rounded font-caption text-caption font-semibold shrink-0 transition-colors ${
              lesson.videoUrl ? "bg-tertiary-fixed/40 text-on-tertiary-fixed-variant" : "bg-surface-container text-secondary hover:bg-surface-container-high"
            }`}
            onClick={() => fileRef.current?.click()}
            disabled={uploadState === "uploading"}
            type="button"
            title={uploadError ?? undefined}
          >
            {uploadState === "uploading" ? "Uploading…" : lesson.videoUrl ? "Video attached" : "Attach video"}
          </button>
        </>
      ) : null}
      <button
        className="w-7 h-7 rounded text-secondary hover:bg-error-container hover:text-on-error-container flex items-center justify-center shrink-0 transition-colors disabled:opacity-50"
        onClick={() => startTransition(() => void deleteLesson(lesson.id))}
        disabled={isPending}
        type="button"
      >
        <span className="material-symbols-outlined text-sm">close</span>
      </button>
    </div>
  );
}

function AddLessonRow({ moduleId }: { moduleId: string }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<LessonType>("VIDEO");
  const [duration, setDuration] = useState(15);
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!title.trim()) return;
    const input: LessonInput = { title, type, durationMinutes: duration, content: "" };
    startTransition(async () => {
      await addLesson(moduleId, input);
      setTitle("");
    });
  }

  return (
    <div className="flex items-center gap-2 pt-1">
      <input
        className="flex-1 h-8 px-2 rounded bg-surface-container-lowest text-on-surface text-body-sm focus:outline-none"
        placeholder="New lesson title..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />
      <select className="h-8 px-1.5 rounded bg-surface-container-lowest text-on-surface font-caption text-caption focus:outline-none" value={type} onChange={(e) => setType(e.target.value as LessonType)}>
        <option value="VIDEO">Video</option>
        <option value="READING">Reading</option>
        <option value="CODE_SANDBOX">Code Sandbox</option>
        <option value="QUIZ">Quiz</option>
      </select>
      <input
        className="w-16 h-8 px-1.5 rounded bg-surface-container-lowest text-on-surface font-caption text-caption focus:outline-none"
        type="number"
        min="1"
        value={duration}
        onChange={(e) => setDuration(Number(e.target.value))}
        title="Duration (minutes)"
      />
      <button
        className="h-8 px-2.5 rounded bg-surface-container text-on-surface hover:bg-surface-container-high font-caption text-caption font-semibold disabled:opacity-50"
        onClick={submit}
        disabled={isPending || !title.trim()}
        type="button"
      >
        Add
      </button>
    </div>
  );
}
