import type { GoalStatus } from "./progress-types";

export type { GoalStatus } from "./progress-types";

export const GOAL_STATUS_META: Record<
  GoalStatus,
  { label: string; badge: string }
> = {
  active: { label: "Active", badge: "badge-success badge-outline" },
  abandoned: { label: "Abandoned", badge: "badge-ghost" },
};

export const VISIBILITY_META = {
  private: { label: "Private", badge: "badge-ghost" },
  shared: { label: "Shared", badge: "badge-info badge-outline" },
} as const;

export type Visibility = keyof typeof VISIBILITY_META;

export function isGoalComplete(
  steps: { completedAt: Date | null }[],
): boolean {
  return steps.length > 0 && steps.every((s) => s.completedAt !== null);
}

export function goalProgressLabel(steps: { completedAt: Date | null }[]): string {
  if (steps.length === 0) return "0 steps";
  const done = steps.filter((s) => s.completedAt !== null).length;
  if (done === steps.length) return "Complete";
  return `${done}/${steps.length} steps`;
}

export function assessmentPercent(rawScore: string, maxScore: string): number {
  const raw = Number(rawScore);
  const max = Number(maxScore);
  if (!Number.isFinite(raw) || !Number.isFinite(max) || max <= 0) return 0;
  return Math.round((raw / max) * 1000) / 10;
}

export function formatScore(rawScore: string, maxScore: string): string {
  const pct = assessmentPercent(rawScore, maxScore);
  return `${Number(rawScore)}/${Number(maxScore)} (${pct}%)`;
}

export type ReportContent = {
  goals: {
    id: string;
    title: string;
    subjectName: string | null;
    stepsCompleted: { title: string; completedAt: string }[];
    allStepsCount: number;
    complete: boolean;
  }[];
  assessments: {
    seriesName: string;
    subjectName: string | null;
    points: { takenOn: string; rawScore: string; maxScore: string }[];
  }[];
};

export function parseNoteVisibility(
  value: string | null,
): "private" | "shared" {
  return value === "shared" ? "shared" : "private";
}
