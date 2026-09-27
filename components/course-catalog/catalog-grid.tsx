"use client";

import { useMemo, useState, useTransition } from "react";
import { initials } from "@/lib/format";
import { toggleSaveCourse } from "@/app/(dashboard)/my-learning/actions";
import { downloadCsv, toCsv } from "@/lib/csv";
import { courseThumbnailUrl } from "@/lib/placeholder-image";

export type CatalogCourse = {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "ALL_LEVELS";
  ceuCredits: number;
  durationHours: number;
  rating: number;
  ratingCount: number;
  instructorName: string | null;
  instructorTitle: string | null;
  isCohort: boolean;
  isMandatory: boolean;
  cohortTeamPercent: number | null;
  moduleCount: number;
  passRatePercent: number | null;
  dueInDays: number | null;
  enrollmentStatus: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE" | null;
  enrollmentProgress: number;
  isSaved: boolean;
};

function SaveToggle({ courseId, initialSaved }: { courseId: string; initialSaved: boolean }) {
  const [saved, setSaved] = useState(initialSaved);
  const [, startTransition] = useTransition();
  return (
    <button
      className={`w-8 h-8 rounded-full backdrop-blur-md flex items-center justify-center shrink-0 transition-colors ${
        saved ? "bg-primary text-on-primary" : "bg-surface-container-lowest/90 text-secondary hover:text-primary"
      }`}
      onClick={(e) => {
        e.stopPropagation();
        const next = !saved;
        setSaved(next);
        startTransition(async () => {
          await toggleSaveCourse(courseId);
        });
      }}
      type="button"
      title={saved ? "Remove from saved" : "Save for later"}
    >
      <span className="material-symbols-outlined text-base" style={saved ? { fontVariationSettings: "'FILL' 1" } : undefined}>
        bookmark
      </span>
    </button>
  );
}

const DIFFICULTY_LABEL: Record<CatalogCourse["difficulty"], string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
  ALL_LEVELS: "All Levels",
};

function ctaLabel(course: CatalogCourse) {
  if (course.enrollmentStatus === "COMPLETED") return "Review";
  if (course.enrollmentStatus === "IN_PROGRESS" || course.enrollmentStatus === "OVERDUE") return "Continue";
  return "Start";
}

export function CatalogGrid({ courses }: { courses: CatalogCourse[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All Departments");
  const [difficulty, setDifficulty] = useState<string>("All");
  const [ceuOnly, setCeuOnly] = useState(false);
  const [sort, setSort] = useState<"popular" | "rating" | "ceu">("popular");
  const [view, setView] = useState<"grid" | "list">("grid");

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of courses) counts.set(c.category, (counts.get(c.category) ?? 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [courses]);

  const filtered = useMemo(() => {
    let result = courses.filter((c) => {
      const matchesQuery =
        !query ||
        c.title.toLowerCase().includes(query.toLowerCase()) ||
        (c.instructorName ?? "").toLowerCase().includes(query.toLowerCase()) ||
        c.category.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = category === "All Departments" || c.category === category;
      const matchesDifficulty = difficulty === "All" || c.difficulty === difficulty;
      const matchesCeu = !ceuOnly || c.ceuCredits > 0;
      return matchesQuery && matchesCategory && matchesDifficulty && matchesCeu;
    });
    result = result.slice().sort((a, b) => {
      if (sort === "rating") return b.rating - a.rating;
      if (sort === "ceu") return b.ceuCredits - a.ceuCredits;
      return b.ratingCount - a.ratingCount;
    });
    return result;
  }, [courses, query, category, difficulty, ceuOnly, sort]);

  const cohortCourses = filtered.filter((c) => c.isCohort);
  const onDemandCourses = filtered.filter((c) => !c.isCohort);

  return (
    <div className="flex flex-col gap-space-lg">
      <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-space-md">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-md">
          <div className="relative w-full lg:w-96">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary text-lg">search</span>
            <input
              className="w-full h-10 pl-10 pr-4 bg-surface-container-low text-on-surface font-body-sm text-body-sm rounded-lg placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Search by topic, instructor, skill tag..."
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-space-sm w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0">
            <select
              className="h-10 px-3.5 rounded-lg bg-surface-container-low text-on-surface font-label-md text-label-md shrink-0"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option value="All">Difficulty: All</option>
              {Object.entries(DIFFICULTY_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button
              className={`h-10 px-3.5 rounded-lg font-label-md text-label-md flex items-center gap-2 shrink-0 transition-colors ${
                ceuOnly ? "bg-primary text-on-primary" : "bg-surface-container-low text-on-surface hover:bg-surface-container"
              }`}
              onClick={() => setCeuOnly((v) => !v)}
              type="button"
            >
              <span className="material-symbols-outlined text-lg">workspace_premium</span>
              CEU Accredited
            </button>
            <select
              className="h-10 px-3.5 rounded-lg bg-surface-container-low text-on-surface font-label-md text-label-md shrink-0"
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
            >
              <option value="popular">Sort: Most Popular</option>
              <option value="rating">Sort: Highest Rated</option>
              <option value="ceu">Sort: CEU Credits</option>
            </select>
            <div className="h-6 w-px bg-surface-container-high mx-1 shrink-0" />
            <button
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${view === "grid" ? "bg-surface-container-low text-primary" : "bg-surface-container-lowest text-secondary hover:bg-surface-container-low"}`}
              onClick={() => setView("grid")}
              type="button"
              aria-label="Grid view"
            >
              <span className="material-symbols-outlined text-xl">grid_view</span>
            </button>
            <button
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${view === "list" ? "bg-surface-container-low text-primary" : "bg-surface-container-lowest text-secondary hover:bg-surface-container-low"}`}
              onClick={() => setView("list")}
              type="button"
              aria-label="List view"
            >
              <span className="material-symbols-outlined text-xl">view_list</span>
            </button>
            <div className="h-6 w-px bg-surface-container-high mx-1 shrink-0" />
            <button
              className="h-10 px-3.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md flex items-center gap-2 shrink-0 transition-colors"
              onClick={() => {
                const csv = toCsv(
                  filtered.map((c) => ({
                    title: c.title,
                    category: c.category,
                    difficulty: DIFFICULTY_LABEL[c.difficulty],
                    ceuCredits: c.ceuCredits,
                    durationHours: c.durationHours,
                    rating: c.rating,
                    ratingCount: c.ratingCount,
                    instructor: c.instructorName ?? "",
                    enrollmentStatus: c.enrollmentStatus ?? "Not enrolled",
                  })),
                  [
                    { key: "title", label: "Course Title" },
                    { key: "category", label: "Category" },
                    { key: "difficulty", label: "Difficulty" },
                    { key: "ceuCredits", label: "CEU Credits" },
                    { key: "durationHours", label: "Duration (hrs)" },
                    { key: "rating", label: "Rating" },
                    { key: "ratingCount", label: "Rating Count" },
                    { key: "instructor", label: "Instructor" },
                    { key: "enrollmentStatus", label: "My Status" },
                  ],
                );
                downloadCsv(`course-catalog-${new Date().toISOString().slice(0, 10)}.csv`, csv);
              }}
              type="button"
            >
              <span className="material-symbols-outlined text-lg">file_download</span>
              <span className="hidden sm:inline">Export ({filtered.length})</span>
            </button>
          </div>
        </div>
        <div className="flex items-center gap-space-xs overflow-x-auto pt-1 pb-1">
          <span className="font-caption text-caption text-secondary uppercase tracking-wider mr-2 shrink-0">Departments:</span>
          <button
            className={`px-3 py-1.5 rounded-full font-label-sm text-label-sm shrink-0 transition-colors ${
              category === "All Departments" ? "bg-primary text-on-primary shadow-sm" : "bg-surface-container-low hover:bg-surface-container text-on-surface-variant"
            }`}
            onClick={() => setCategory("All Departments")}
            type="button"
          >
            All Departments ({courses.length})
          </button>
          {categories.map(([name, count]) => (
            <button
              key={name}
              className={`px-3 py-1.5 rounded-full font-label-sm text-label-sm shrink-0 transition-colors ${
                category === name ? "bg-primary text-on-primary shadow-sm" : "bg-surface-container-low hover:bg-surface-container text-on-surface-variant"
              }`}
              onClick={() => setCategory(name)}
              type="button"
            >
              {name} ({count})
            </button>
          ))}
        </div>
      </div>

      {cohortCourses.length > 0 ? (
        <div className="flex flex-col gap-space-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-primary text-2xl">auto_awesome</span>
              <h2 className="font-headline-sm text-headline-sm text-on-surface">Premier Executive &amp; Engineering Cohorts</h2>
            </div>
          </div>
          <div className={`grid grid-cols-1 ${view === "grid" ? "lg:grid-cols-2" : ""} gap-space-lg`}>
            {cohortCourses.map((course) => (
              <div key={course.id} className="group bg-surface-container-lowest rounded-xl p-space-lg shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-44 h-44 bg-surface-container-low rounded-bl-full pointer-events-none transition-transform group-hover:scale-105" />
                <div className="flex flex-col gap-space-md relative z-10">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">stars</span> Accredited Cohort Track
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-secondary font-label-sm text-label-sm">{course.ceuCredits} CEU Credits</span>
                      <SaveToggle courseId={course.id} initialSaved={course.isSaved} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <h3 className="font-headline-sm text-headline-sm text-on-surface group-hover:text-primary transition-colors">{course.title}</h3>
                    <p className="font-body-sm text-body-sm text-secondary">{course.description}</p>
                  </div>
                  <div className="flex items-center justify-between pt-space-xs bg-surface-container-low/60 rounded-lg p-3 flex-wrap gap-2">
                    <div className="flex items-center gap-space-sm">
                      <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-label-md text-label-md font-bold">
                        {initials(course.instructorName ?? course.category)}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-label-md text-label-md text-on-surface font-semibold">{course.instructorName ?? "Faculty Team"}</span>
                        <span className="font-caption text-caption text-secondary">{course.instructorTitle ?? ""}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-label-md text-label-md text-on-surface font-semibold">
                        {course.durationHours} Hours{course.moduleCount ? ` • ${course.moduleCount} Modules` : ""}
                      </div>
                      {course.cohortTeamPercent ? (
                        <div className="font-caption text-caption text-tertiary font-semibold flex items-center justify-end gap-1">
                          <span className="material-symbols-outlined text-sm">group</span> {course.cohortTeamPercent}% Team Enrolled
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-space-md mt-space-sm relative z-10">
                  <span className="font-caption text-caption text-secondary">{course.ratingCount} learners enrolled</span>
                  <button className="h-9 px-space-md rounded-lg bg-primary text-on-primary hover:bg-primary/90 font-label-md text-label-md flex items-center gap-1.5 transition-colors" type="button">
                    <span>{ctaLabel(course)} Cohort</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-space-md pt-space-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-sm">
            <h2 className="font-headline-sm text-headline-sm text-on-surface">On-Demand Course Modules</h2>
            <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-secondary font-label-sm text-label-sm">{onDemandCourses.length} Available</span>
          </div>
        </div>
        {onDemandCourses.length === 0 ? (
          <div className="py-10 text-center font-body-sm text-body-sm text-secondary bg-surface-container-lowest rounded-xl">
            No courses match these filters.
          </div>
        ) : (
          <div className={`grid grid-cols-1 ${view === "grid" ? "md:grid-cols-2 lg:grid-cols-3" : ""} gap-space-lg`}>
            {onDemandCourses.map((course) => (
              <div key={course.id} className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col group">
                <div className="relative aspect-video w-full overflow-hidden bg-surface-container">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={courseThumbnailUrl(course.id)}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/20" />
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                    <span className="px-2 py-1 rounded bg-surface-container-lowest/90 backdrop-blur-sm text-on-surface font-label-sm text-label-sm font-semibold">{course.category}</span>
                    <SaveToggle courseId={course.id} initialSaved={course.isSaved} />
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white font-caption text-caption">
                    <span className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm">
                      <span className="material-symbols-outlined text-sm">timer</span> {course.durationHours} hrs
                    </span>
                    <span className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm font-semibold text-amber-300">
                      <span className="material-symbols-outlined text-sm">star</span> {course.rating.toFixed(1)} ({course.ratingCount})
                    </span>
                  </div>
                </div>
                <div className="w-full h-1 bg-surface-container">
                  <div className="h-full bg-primary" style={{ width: `${course.enrollmentProgress}%` }} />
                </div>
                <div className="p-space-md flex flex-col justify-between flex-1 gap-space-md">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-caption text-caption text-secondary">
                        {DIFFICULTY_LABEL[course.difficulty]} • {course.ceuCredits} CEU
                      </span>
                      {course.enrollmentStatus === "COMPLETED" ? (
                        <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant font-label-sm text-label-sm font-semibold flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">check_circle</span> Completed
                        </span>
                      ) : course.isMandatory && course.dueInDays !== null ? (
                        <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-semibold flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">alarm</span> Due in {course.dueInDays}d
                        </span>
                      ) : course.enrollmentStatus === "IN_PROGRESS" ? (
                        <span className="px-2 py-0.5 rounded-full bg-surface-container-low text-primary font-label-sm text-label-sm font-semibold flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">play_circle</span> {Math.round(course.enrollmentProgress)}%
                        </span>
                      ) : course.passRatePercent && course.passRatePercent >= 90 ? (
                        <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm font-semibold flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">trending_up</span> High Demand
                        </span>
                      ) : null}
                    </div>
                    <h3 className="font-title-md text-title-md text-on-surface group-hover:text-primary transition-colors line-clamp-2">{course.title}</h3>
                    <p className="font-body-sm text-body-sm text-secondary line-clamp-2">{course.description}</p>
                  </div>
                  <div className="flex items-center justify-between pt-space-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-label-sm text-label-sm font-bold">
                        {initials(course.instructorName ?? course.category)}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-label-sm text-label-sm text-on-surface leading-tight">{course.instructorName ?? "Faculty Team"}</span>
                        <span className="font-caption text-caption text-secondary leading-tight">{course.instructorTitle ?? ""}</span>
                      </div>
                    </div>
                    <button className="h-8 px-3 rounded-lg bg-surface-container-low text-on-surface hover:bg-primary hover:text-on-primary font-label-md text-label-md transition-colors flex items-center gap-1" type="button">
                      {ctaLabel(course)}
                      <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
