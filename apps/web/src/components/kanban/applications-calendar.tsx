"use client";

import { useState, useMemo } from "react";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import type { Job } from "@/hooks/use-jobs";
import type { Stage } from "@/hooks/use-stages";
import { StageIcon } from "./stage-icons";

interface ApplicationsCalendarProps {
  jobs: Job[];
  stages: Stage[];
  onJobClick: (job: Job) => void;
}

// --- Helpers ---

function getJobDate(job: Job): Date {
  const dateStr = job.applied_at ?? job.created_at;
  return new Date(dateStr);
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isSameMonth(date: Date, month: Date): boolean {
  return (
    date.getFullYear() === month.getFullYear() &&
    date.getMonth() === month.getMonth()
  );
}

function getDaysForGrid(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Start from Sunday of the first week
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  // End at Saturday of the last week
  const endDate = new Date(lastDay);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

  const days: Date[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function groupJobsByDate(jobs: Job[]): Map<string, Job[]> {
  const map = new Map<string, Job[]>();
  for (const job of jobs) {
    const key = toDateKey(getJobDate(job));
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(job);
  }
  return map;
}

function getStagePillStyle(stage: Stage | undefined): {
  bg: string;
  text: string;
  border: string;
} {
  if (!stage?.color) return { bg: "var(--surface)", text: "var(--text-muted)", border: "var(--border-subtle)" };
  const hex = stage.color.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return {
    bg: `rgba(${r}, ${g}, ${b}, 0.08)`,
    text: stage.color,
    border: `rgba(${r}, ${g}, ${b}, 0.3)`,
  };
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// --- Component ---

export function ApplicationsCalendar({
  jobs,
  stages,
  onJobClick,
}: ApplicationsCalendarProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDay, setSelectedDay] = useState<Date>(today);

  const stageMap = useMemo(
    () => new Map(stages.map((s) => [s.id, s])),
    [stages]
  );

  const jobsByDate = useMemo(() => groupJobsByDate(jobs), [jobs]);

  const days = useMemo(
    () => getDaysForGrid(currentMonth.getFullYear(), currentMonth.getMonth()),
    [currentMonth]
  );

  const selectedDayJobs = useMemo(() => {
    return jobsByDate.get(toDateKey(selectedDay)) ?? [];
  }, [jobsByDate, selectedDay]);

  function previousMonth() {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
    );
  }

  function nextMonth() {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
    );
  }

  function goToToday() {
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDay(now);
  }

  if (jobs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-sm text-text-primary font-medium">
            No applications yet
          </p>
          <p className="text-xs text-text-muted mt-1">
            Add a job to start tracking your applications.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Calendar Header */}
      <div className="flex items-center justify-between pb-4">
        <h2 className="text-lg font-semibold text-text-primary font-[family-name:var(--font-space-grotesk)]">
          {formatMonthYear(currentMonth)}
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={goToToday}
            className="px-3 py-1.5 rounded-full border border-border-subtle text-xs font-medium text-text-primary hover:bg-surface-hover transition-colors mr-1"
          >
            Today
          </button>
          <button
            onClick={previousMonth}
            className="flex items-center justify-center w-8 h-8 rounded-full border border-border-subtle hover:bg-surface-hover transition-colors"
            aria-label="Previous month"
          >
            <CaretLeftIcon className="w-4 h-4 text-text-primary" />
          </button>
          <button
            onClick={nextMonth}
            className="flex items-center justify-center w-8 h-8 rounded-full border border-border-subtle hover:bg-surface-hover transition-colors"
            aria-label="Next month"
          >
            <CaretRightIcon className="w-4 h-4 text-text-primary" />
          </button>
        </div>
      </div>

      {/* Desktop Calendar Grid */}
      <div className="hidden lg:flex flex-col flex-1 min-h-0">
        {/* Weekday header */}
        <div className="grid grid-cols-7 gap-px mb-1">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-semibold text-text-muted py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-px flex-1 auto-rows-fr">
          {days.map((day, idx) => {
            const key = toDateKey(day);
            const dayJobs = jobsByDate.get(key) ?? [];
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, today);
            const isSelected = isSameDay(day, selectedDay);

            return (
              <div
                key={idx}
                onClick={() => setSelectedDay(day)}
                className={`
                  flex flex-col rounded-[10px] border p-2 min-h-[100px] cursor-pointer transition-colors
                  ${isCurrentMonth ? "bg-card border-border-subtle" : "bg-surface border-border-subtle opacity-40"}
                  ${isSelected && isCurrentMonth ? "ring-1 ring-brand/40 border-brand/30" : ""}
                  ${isCurrentMonth ? "hover:bg-surface-hover" : ""}
                `}
              >
                {/* Day number */}
                <div className="flex items-start justify-between mb-1">
                  <span
                    className={`
                      flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full
                      ${isToday ? "bg-brand text-white" : isCurrentMonth ? "text-text-primary" : "text-text-muted"}
                    `}
                  >
                    {day.getDate()}
                  </span>
                  {dayJobs.length > 0 && (
                    <span className="text-[9px] text-text-muted font-medium mt-1">
                      {dayJobs.length}
                    </span>
                  )}
                </div>

                {/* Job pills */}
                <div className="flex flex-col gap-0.5 flex-1 min-h-0 overflow-hidden">
                  {dayJobs.slice(0, 2).map((job) => {
                    const stage = job.stage_id
                      ? stageMap.get(job.stage_id)
                      : undefined;
                    const style = getStagePillStyle(stage);

                    return (
                      <button
                        key={job.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onJobClick(job);
                        }}
                        className="flex items-center gap-1.5 px-1.5 py-1 rounded-md text-left transition-colors hover:opacity-80 w-full min-w-0"
                        style={{ backgroundColor: style.bg }}
                      >
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-[10px] font-medium text-text-primary truncate leading-tight">
                            {job.title}
                          </span>
                          <span className="text-[9px] text-text-muted truncate leading-tight">
                            {job.company_name ?? "Unknown"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                  {dayJobs.length > 2 && (
                    <span className="text-[9px] text-text-muted font-medium pl-1">
                      +{dayJobs.length - 2} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Calendar */}
      <div className="lg:hidden flex flex-col flex-1 min-h-0">
        {/* Weekday header */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="text-center text-[10px] font-semibold text-text-muted py-1.5"
            >
              {day.charAt(0)}
            </div>
          ))}
        </div>

        {/* Compact day grid */}
        <div className="grid grid-cols-7 gap-px">
          {days.map((day, idx) => {
            const key = toDateKey(day);
            const dayJobs = jobsByDate.get(key) ?? [];
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, today);
            const isSelected = isSameDay(day, selectedDay);

            // Get unique stage colors for dots
            const dotColors = [
              ...new Set(
                dayJobs
                  .map((j) =>
                    j.stage_id ? stageMap.get(j.stage_id)?.color : undefined
                  )
                  .filter(Boolean)
              ),
            ].slice(0, 3) as string[];

            return (
              <button
                key={idx}
                onClick={() => setSelectedDay(day)}
                className={`
                  flex flex-col items-center py-2 rounded-lg transition-colors
                  ${!isCurrentMonth ? "opacity-30" : ""}
                  ${isSelected && !isToday ? "bg-surface" : ""}
                `}
              >
                <span
                  className={`
                    flex items-center justify-center w-7 h-7 text-xs font-medium rounded-full
                    ${isToday && isSelected ? "bg-brand text-white" : ""}
                    ${isToday && !isSelected ? "bg-brand/15 text-brand font-semibold" : ""}
                    ${!isToday && isSelected ? "bg-primary text-primary-foreground" : ""}
                    ${!isToday && !isSelected && isCurrentMonth ? "text-text-primary" : ""}
                    ${!isCurrentMonth ? "text-text-muted" : ""}
                  `}
                >
                  {day.getDate()}
                </span>
                {/* Stage dots */}
                <div className="flex gap-0.5 mt-1 h-1.5">
                  {dotColors.map((color, i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected day job list */}
        <div className="mt-4 flex-1 min-h-0 overflow-y-auto">
          <h3 className="text-xs font-semibold text-text-muted mb-2">
            {selectedDay.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </h3>
          {selectedDayJobs.length === 0 ? (
            <p className="text-xs text-text-muted py-4 text-center">
              No applications on this day
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {selectedDayJobs.map((job) => {
                const stage = job.stage_id
                  ? stageMap.get(job.stage_id)
                  : undefined;
                const style = getStagePillStyle(stage);

                return (
                  <button
                    key={job.id}
                    onClick={() => onJobClick(job)}
                    className="flex items-center gap-3 p-3 rounded-[10px] bg-card border border-border-subtle text-left hover:border-border-subtle transition-colors"
                  >
                    <StageIcon
                      stageName={stage?.name ?? "default"}
                      className="w-4 h-4 shrink-0"
                      color={stage?.color ?? "#8B8FA3"}
                    />
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <span className="text-sm font-medium text-text-primary truncate">
                        {job.title}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text-muted truncate">
                          {job.company_name ?? "Unknown"}
                        </span>
                        {stage && (
                          <span
                            className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                            style={{
                              backgroundColor: style.bg,
                              color: style.text,
                            }}
                          >
                            {stage.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
