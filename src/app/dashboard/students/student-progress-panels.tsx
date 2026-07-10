import Link from "next/link";
import {
  addGoalStepAction,
  createAssessmentAction,
  createAssessmentSeriesAction,
  createGoalAction,
  createProgressReportAction,
  deleteAssessmentAction,
  deleteAssessmentSeriesAction,
  deleteGoalAction,
  deleteGoalStepAction,
  deleteProgressReportAction,
  toggleGoalStepAction,
  updateAssessmentSeriesAction,
  updateGoalAction,
} from "./progress-actions";
import {
  GOAL_STATUS_META,
  VISIBILITY_META,
  formatScore,
  goalProgressLabel,
  isGoalComplete,
  type GoalStatus,
} from "@/lib/progress";

type Subject = { id: string; name: string };

type GoalRow = {
  id: string;
  title: string;
  description: string | null;
  targetDate: string | null;
  status: GoalStatus;
  visibility: "private" | "shared";
  subjectId: string | null;
  subject: { name: string } | null;
  steps: {
    id: string;
    title: string;
    orderIndex: number;
    completedAt: Date | null;
  }[];
};

type SeriesRow = {
  id: string;
  name: string;
  description: string | null;
  visibility: "private" | "shared";
  subjectId: string | null;
  subject: { name: string } | null;
  assessments: {
    id: string;
    takenOn: string;
    rawScore: string;
    maxScore: string;
    notes: string | null;
  }[];
};

type ReportRow = {
  id: string;
  periodStart: string;
  periodEnd: string;
  summary: string;
  sentAt: Date | null;
  createdAt: Date;
};

function VisibilitySelect({
  defaultValue,
  name = "visibility",
}: {
  defaultValue: "private" | "shared";
  name?: string;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      className="select select-bordered select-sm"
    >
      <option value="private">Private</option>
      <option value="shared">Shared with client</option>
    </select>
  );
}

function SubjectSelect({
  subjects,
  defaultValue,
}: {
  subjects: Subject[];
  defaultValue?: string | null;
}) {
  return (
    <select
      name="subjectId"
      defaultValue={defaultValue ?? ""}
      className="select select-bordered select-sm"
    >
      <option value="">Any / cross-cutting</option>
      {subjects.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
}

export function StudentProgressPanels({
  studentId,
  subjects,
  goalRows,
  seriesRows,
  reportRows,
}: {
  studentId: string;
  subjects: Subject[];
  goalRows: GoalRow[];
  seriesRows: SeriesRow[];
  reportRows: ReportRow[];
}) {
  const createGoal = createGoalAction.bind(null, studentId);
  const createSeries = createAssessmentSeriesAction.bind(null, studentId);
  const createReport = createProgressReportAction.bind(null, studentId);
  const here = `/dashboard/students/${studentId}`;
  const toggleStep = toggleGoalStepAction.bind(null, here);
  const createAssessment = createAssessmentAction.bind(null, here);
  const deleteAssessment = deleteAssessmentAction.bind(null, here);

  return (
    <div className="flex flex-col gap-6 lg:col-span-2">
      {/* Goals */}
      <section className="card bg-base-100 shadow-sm">
        <div className="card-body gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="card-title text-lg">Goals</h2>
            <p className="text-sm text-base-content/70">
              Student-scoped roadmap. Share selectively with the portal.
            </p>
          </div>

          {goalRows.length === 0 ? (
            <p className="text-sm text-base-content/70">No goals yet.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {goalRows.map((goal) => {
                const update = updateGoalAction.bind(null, goal.id);
                const addStep = addGoalStepAction.bind(null, goal.id);
                const removeGoal = deleteGoalAction.bind(null, goal.id);
                const complete = isGoalComplete(goal.steps);
                const statusMeta = GOAL_STATUS_META[goal.status];
                const visMeta = VISIBILITY_META[goal.visibility];
                return (
                  <li
                    key={goal.id}
                    className="rounded-2xl border border-base-300 p-4"
                  >
                    <form action={update} className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          name="title"
                          required
                          defaultValue={goal.title}
                          className="input input-bordered input-sm flex-1 min-w-48 font-semibold"
                        />
                        <span className={`badge badge-sm ${statusMeta.badge}`}>
                          {statusMeta.label}
                        </span>
                        {complete && (
                          <span className="badge badge-sm badge-success">
                            Complete
                          </span>
                        )}
                        <span className={`badge badge-sm ${visMeta.badge}`}>
                          {visMeta.label}
                        </span>
                        <span className="text-xs text-base-content/60">
                          {goalProgressLabel(goal.steps)}
                        </span>
                      </div>
                      <textarea
                        name="description"
                        rows={2}
                        defaultValue={goal.description ?? ""}
                        placeholder="Optional description"
                        className="textarea textarea-bordered textarea-sm"
                      />
                      <div className="flex flex-wrap items-end gap-2">
                        <label className="form-control">
                          <span className="label-text text-xs mb-1">Subject</span>
                          <SubjectSelect
                            subjects={subjects}
                            defaultValue={goal.subjectId}
                          />
                        </label>
                        <label className="form-control">
                          <span className="label-text text-xs mb-1">
                            Target date
                          </span>
                          <input
                            name="targetDate"
                            type="date"
                            defaultValue={goal.targetDate ?? ""}
                            className="input input-bordered input-sm"
                          />
                        </label>
                        <label className="form-control">
                          <span className="label-text text-xs mb-1">Status</span>
                          <select
                            name="status"
                            defaultValue={goal.status}
                            className="select select-bordered select-sm"
                          >
                            <option value="active">Active</option>
                            <option value="abandoned">Abandoned</option>
                          </select>
                        </label>
                        <label className="form-control">
                          <span className="label-text text-xs mb-1">
                            Visibility
                          </span>
                          <VisibilitySelect defaultValue={goal.visibility} />
                        </label>
                        <button type="submit" className="btn btn-sm">
                          Save
                        </button>
                      </div>
                    </form>

                    <ul className="mt-3 flex flex-col gap-1.5 border-t border-base-200 pt-3">
                      {goal.steps.map((step) => {
                        const removeStep = deleteGoalStepAction.bind(
                          null,
                          step.id,
                        );
                        const done = step.completedAt !== null;
                        return (
                          <li
                            key={step.id}
                            className="flex flex-wrap items-center gap-2"
                          >
                            <form action={toggleStep} className="flex items-center">
                              <input type="hidden" name="stepId" value={step.id} />
                              <input
                                type="hidden"
                                name="completed"
                                value={done ? "0" : "1"}
                              />
                              <button
                                type="submit"
                                className={`btn btn-xs ${done ? "btn-success" : "btn-ghost"}`}
                                title={done ? "Mark incomplete" : "Mark complete"}
                              >
                                {done ? "✓" : "○"}
                              </button>
                            </form>
                            <span
                              className={`text-sm ${done ? "line-through text-base-content/50" : ""}`}
                            >
                              {step.title}
                            </span>
                            <form action={removeStep}>
                              <button
                                type="submit"
                                className="btn btn-ghost btn-xs text-error"
                              >
                                Remove
                              </button>
                            </form>
                          </li>
                        );
                      })}
                    </ul>

                    <form
                      action={addStep}
                      className="mt-2 flex flex-wrap items-center gap-2"
                    >
                      <input
                        name="title"
                        required
                        placeholder="Add a step…"
                        className="input input-bordered input-sm flex-1 min-w-40"
                      />
                      <button type="submit" className="btn btn-sm btn-outline">
                        Add step
                      </button>
                    </form>

                    <form action={removeGoal} className="mt-2">
                      <button
                        type="submit"
                        className="btn btn-ghost btn-xs text-error"
                      >
                        Delete goal
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}

          <details className="collapse collapse-arrow border border-base-300 rounded-2xl">
            <summary className="collapse-title text-sm font-semibold">
              + New goal
            </summary>
            <div className="collapse-content">
              <form action={createGoal} className="flex flex-col gap-2 pt-1">
                <input
                  name="title"
                  required
                  placeholder="Goal title"
                  className="input input-bordered input-sm"
                />
                <textarea
                  name="description"
                  rows={2}
                  placeholder="Optional description"
                  className="textarea textarea-bordered textarea-sm"
                />
                <div className="flex flex-wrap gap-2">
                  <SubjectSelect subjects={subjects} />
                  <input
                    name="targetDate"
                    type="date"
                    className="input input-bordered input-sm"
                  />
                  <VisibilitySelect defaultValue="private" />
                </div>
                <p className="text-xs text-base-content/60">
                  Optional steps (leave blank for a single-step goal using the
                  title):
                </p>
                <input
                  name="stepTitle"
                  placeholder="Step 1"
                  className="input input-bordered input-sm"
                />
                <input
                  name="stepTitle"
                  placeholder="Step 2"
                  className="input input-bordered input-sm"
                />
                <input
                  name="stepTitle"
                  placeholder="Step 3"
                  className="input input-bordered input-sm"
                />
                <button type="submit" className="btn btn-primary btn-sm self-start">
                  Create goal
                </button>
              </form>
            </div>
          </details>
        </div>
      </section>

      {/* Assessments */}
      <section className="card bg-base-100 shadow-sm">
        <div className="card-body gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="card-title text-lg">Assessments</h2>
            <p className="text-sm text-base-content/70">
              Series hold comparable scores over time. Visibility is on the
              series.
            </p>
          </div>

          {seriesRows.length === 0 ? (
            <p className="text-sm text-base-content/70">No assessment series yet.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {seriesRows.map((series) => {
                const update = updateAssessmentSeriesAction.bind(null, series.id);
                const remove = deleteAssessmentSeriesAction.bind(null, series.id);
                const visMeta = VISIBILITY_META[series.visibility];
                return (
                  <li
                    key={series.id}
                    className="rounded-2xl border border-base-300 p-4"
                  >
                    <form action={update} className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          name="name"
                          required
                          defaultValue={series.name}
                          className="input input-bordered input-sm flex-1 min-w-48 font-semibold"
                        />
                        <span className={`badge badge-sm ${visMeta.badge}`}>
                          {visMeta.label}
                        </span>
                      </div>
                      <textarea
                        name="description"
                        rows={2}
                        defaultValue={series.description ?? ""}
                        placeholder="Optional notes about this instrument"
                        className="textarea textarea-bordered textarea-sm"
                      />
                      <div className="flex flex-wrap items-end gap-2">
                        <SubjectSelect
                          subjects={subjects}
                          defaultValue={series.subjectId}
                        />
                        <VisibilitySelect defaultValue={series.visibility} />
                        <button type="submit" className="btn btn-sm">
                          Save series
                        </button>
                      </div>
                    </form>

                    <ul className="mt-3 flex flex-col divide-y divide-base-200 border-t border-base-200">
                      {series.assessments.length === 0 ? (
                        <li className="py-2 text-sm text-base-content/60">
                          No scores logged yet.
                        </li>
                      ) : (
                        series.assessments.map((a) => (
                          <li
                            key={a.id}
                            className="flex flex-wrap items-center justify-between gap-2 py-2"
                          >
                            <div className="text-sm">
                              <span className="font-medium">{a.takenOn}</span>
                              <span className="ml-2">
                                {formatScore(a.rawScore, a.maxScore)}
                              </span>
                              {a.notes && (
                                <span className="ml-2 text-base-content/60">
                                  · {a.notes}
                                </span>
                              )}
                            </div>
                            <form action={deleteAssessment}>
                              <input
                                type="hidden"
                                name="assessmentId"
                                value={a.id}
                              />
                              <button
                                type="submit"
                                className="btn btn-ghost btn-xs text-error"
                              >
                                Delete
                              </button>
                            </form>
                          </li>
                        ))
                      )}
                    </ul>

                    <form
                      action={createAssessment}
                      className="mt-3 flex flex-wrap items-end gap-2 border-t border-base-200 pt-3"
                    >
                      <input type="hidden" name="seriesId" value={series.id} />
                      <label className="form-control">
                        <span className="label-text text-xs mb-1">Date</span>
                        <input
                          name="takenOn"
                          type="date"
                          required
                          className="input input-bordered input-sm"
                        />
                      </label>
                      <label className="form-control">
                        <span className="label-text text-xs mb-1">Score</span>
                        <input
                          name="rawScore"
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          placeholder="raw"
                          className="input input-bordered input-sm w-24"
                        />
                      </label>
                      <label className="form-control">
                        <span className="label-text text-xs mb-1">Max</span>
                        <input
                          name="maxScore"
                          type="number"
                          step="0.01"
                          min="0.01"
                          required
                          placeholder="max"
                          className="input input-bordered input-sm w-24"
                        />
                      </label>
                      <label className="form-control flex-1 min-w-32">
                        <span className="label-text text-xs mb-1">
                          Tutor notes
                        </span>
                        <input
                          name="notes"
                          placeholder="private — never shown in portal"
                          className="input input-bordered input-sm"
                        />
                      </label>
                      <button type="submit" className="btn btn-sm btn-outline">
                        Log score
                      </button>
                    </form>

                    <form action={remove} className="mt-2">
                      <button
                        type="submit"
                        className="btn btn-ghost btn-xs text-error"
                      >
                        Delete series
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}

          <details className="collapse collapse-arrow border border-base-300 rounded-2xl">
            <summary className="collapse-title text-sm font-semibold">
              + New assessment series
            </summary>
            <div className="collapse-content">
              <form action={createSeries} className="flex flex-col gap-2 pt-1">
                <input
                  name="name"
                  required
                  placeholder="e.g. GCSE Maths past paper"
                  className="input input-bordered input-sm"
                />
                <textarea
                  name="description"
                  rows={2}
                  placeholder="Optional description"
                  className="textarea textarea-bordered textarea-sm"
                />
                <div className="flex flex-wrap gap-2">
                  <SubjectSelect subjects={subjects} />
                  <VisibilitySelect defaultValue="private" />
                </div>
                <button type="submit" className="btn btn-primary btn-sm self-start">
                  Create series
                </button>
              </form>
            </div>
          </details>
        </div>
      </section>

      {/* Reports */}
      <section className="card bg-base-100 shadow-sm">
        <div className="card-body gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="card-title text-lg">Progress reports</h2>
            <p className="text-sm text-base-content/70">
              Frozen snapshots emailed to linked clients.
            </p>
          </div>

          {reportRows.length === 0 ? (
            <p className="text-sm text-base-content/70">No reports yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-base-200">
              {reportRows.map((report) => {
                const remove = deleteProgressReportAction.bind(null, report.id);
                return (
                  <li
                    key={report.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3"
                  >
                    <div>
                      <Link
                        href={`/dashboard/students/${studentId}/reports/${report.id}`}
                        className="link link-hover font-medium"
                      >
                        {report.periodStart} → {report.periodEnd}
                      </Link>
                      <p className="text-xs text-base-content/60 line-clamp-1">
                        {report.summary}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {report.sentAt ? (
                        <span className="badge badge-sm badge-success">Sent</span>
                      ) : (
                        <span className="badge badge-sm badge-ghost">Draft</span>
                      )}
                      {!report.sentAt && (
                        <form action={remove}>
                          <button
                            type="submit"
                            className="btn btn-ghost btn-xs text-error"
                          >
                            Delete
                          </button>
                        </form>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <details className="collapse collapse-arrow border border-base-300 rounded-2xl">
            <summary className="collapse-title text-sm font-semibold">
              + Compose report
            </summary>
            <div className="collapse-content">
              <form action={createReport} className="flex flex-col gap-2 pt-1">
                <div className="flex flex-wrap gap-2">
                  <label className="form-control">
                    <span className="label-text text-xs mb-1">From</span>
                    <input
                      name="periodStart"
                      type="date"
                      required
                      className="input input-bordered input-sm"
                    />
                  </label>
                  <label className="form-control">
                    <span className="label-text text-xs mb-1">To</span>
                    <input
                      name="periodEnd"
                      type="date"
                      required
                      className="input input-bordered input-sm"
                    />
                  </label>
                </div>
                <textarea
                  name="summary"
                  required
                  rows={4}
                  placeholder="Your framing for the period…"
                  className="textarea textarea-bordered"
                />
                <p className="text-xs text-base-content/60">
                  Shared goal steps completed in-range and shared assessment
                  scores are frozen into the report at generation time.
                </p>
                <button type="submit" className="btn btn-primary btn-sm self-start">
                  Create draft report
                </button>
              </form>
            </div>
          </details>
        </div>
      </section>
    </div>
  );
}
