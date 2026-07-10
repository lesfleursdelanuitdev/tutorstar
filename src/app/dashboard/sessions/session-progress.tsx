import { createAssessmentAction, toggleGoalStepAction } from "../students/progress-actions";
import { formatScore } from "@/lib/progress";

type OpenStep = {
  id: string;
  title: string;
  goalTitle: string;
  completedAt: Date | null;
};

type SeriesOption = {
  id: string;
  name: string;
};

type RecentAssessment = {
  id: string;
  takenOn: string;
  rawScore: string;
  maxScore: string;
  seriesName: string;
};

/** Inline session progress: open goal steps + quick assessment log. */
export function SessionProgress({
  sessionId,
  studentId,
  openSteps,
  series,
  recentAssessments,
  redirectTo,
}: {
  sessionId: string;
  studentId: string;
  openSteps: OpenStep[];
  series: SeriesOption[];
  recentAssessments: RecentAssessment[];
  redirectTo: string;
}) {
  void studentId;
  const toggle = toggleGoalStepAction.bind(null, redirectTo);
  const logAssessment = createAssessmentAction.bind(null, redirectTo);
  const today = new Date().toISOString().slice(0, 10);

  if (openSteps.length === 0 && series.length === 0) {
    return (
      <p className="text-xs text-base-content/60">
        No active goals or assessment series for this student.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-base-200/50 p-3">
      {openSteps.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-bold uppercase tracking-wide text-base-content/60">
            Goal steps
          </p>
          {openSteps.map((step) => {
            const done = step.completedAt !== null;
            return (
              <form
                key={step.id}
                action={toggle}
                className="flex flex-wrap items-center gap-2"
              >
                <input type="hidden" name="stepId" value={step.id} />
                <input type="hidden" name="sessionId" value={sessionId} />
                <input
                  type="hidden"
                  name="completed"
                  value={done ? "0" : "1"}
                />
                <button
                  type="submit"
                  className={`btn btn-xs ${done ? "btn-success" : "btn-ghost"}`}
                >
                  {done ? "✓" : "○"}
                </button>
                <span className={`text-sm ${done ? "line-through opacity-50" : ""}`}>
                  <span className="text-base-content/60">{step.goalTitle} · </span>
                  {step.title}
                </span>
              </form>
            );
          })}
        </div>
      )}

      {series.length > 0 && (
        <form
          action={logAssessment}
          className="flex flex-col gap-1.5 border-t border-base-300 pt-3"
        >
          <p className="text-xs font-bold uppercase tracking-wide text-base-content/60">
            Log assessment
          </p>
          <input type="hidden" name="sessionId" value={sessionId} />
          <input type="hidden" name="takenOn" value={today} />
          <div className="flex flex-wrap items-end gap-1.5">
            <select
              name="seriesId"
              required
              defaultValue=""
              className="select select-bordered select-xs min-w-40"
            >
              <option value="" disabled>
                Series…
              </option>
              {series.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <input
              name="rawScore"
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="score"
              className="input input-bordered input-xs w-20"
            />
            <input
              name="maxScore"
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="max"
              className="input input-bordered input-xs w-20"
            />
            <button type="submit" className="btn btn-xs btn-primary">
              Log
            </button>
          </div>
        </form>
      )}

      {recentAssessments.length > 0 && (
        <ul className="border-t border-base-300 pt-2 text-xs text-base-content/70">
          {recentAssessments.map((a) => (
            <li key={a.id}>
              {a.seriesName}: {formatScore(a.rawScore, a.maxScore)} ({a.takenOn})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
