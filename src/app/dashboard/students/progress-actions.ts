"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  assessmentSeries,
  assessments,
  clientsStudents,
  goalSteps,
  goals,
  progressReports,
} from "@/db/schema";
import { formString, isUuid } from "@/lib/forms";
import {
  isGoalComplete,
  parseNoteVisibility,
  type ReportContent,
} from "@/lib/progress";
import { progressReportEmail, sendEmail } from "@/lib/email";
import { requireRole } from "@/lib/session";

function studentPath(studentId: string) {
  return `/dashboard/students/${studentId}`;
}

function failStudent(studentId: string, message: string): never {
  redirect(`${studentPath(studentId)}?error=${encodeURIComponent(message)}`);
}

function revalidateStudent(studentId: string) {
  revalidatePath(studentPath(studentId));
  revalidatePath("/dashboard/students");
  revalidatePath("/dashboard/sessions");
  revalidatePath("/portal");
}

function parseStepTitles(formData: FormData): string[] {
  const titles = formData
    .getAll("stepTitle")
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter(Boolean);
  return titles;
}

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------

export async function createGoalAction(studentId: string, formData: FormData) {
  await requireRole("tutor");
  if (!isUuid(studentId)) redirect("/dashboard/students");

  const title = formString(formData, "title");
  if (!title) failStudent(studentId, "Goal title is required.");

  let stepTitles = parseStepTitles(formData);
  if (stepTitles.length === 0) {
    // Single-step goals collapse the step layer: the goal title is the step.
    stepTitles = [title];
  }

  const subjectId = formString(formData, "subjectId");
  if (subjectId && !isUuid(subjectId)) {
    failStudent(studentId, "Pick a valid subject.");
  }

  const [goal] = await db
    .insert(goals)
    .values({
      studentId,
      subjectId: subjectId && isUuid(subjectId) ? subjectId : null,
      title,
      description: formString(formData, "description"),
      targetDate: formString(formData, "targetDate"),
      visibility: parseNoteVisibility(formString(formData, "visibility")),
    })
    .returning({ id: goals.id });

  await db.insert(goalSteps).values(
    stepTitles.map((stepTitle, i) => ({
      goalId: goal.id,
      title: stepTitle,
      orderIndex: i,
    })),
  );

  revalidateStudent(studentId);
  redirect(`${studentPath(studentId)}?saved=1`);
}

export async function updateGoalAction(goalId: string, formData: FormData) {
  await requireRole("tutor");
  if (!isUuid(goalId)) redirect("/dashboard/students");

  const goal = await db.query.goals.findFirst({
    where: eq(goals.id, goalId),
    columns: { id: true, studentId: true },
  });
  if (!goal) redirect("/dashboard/students");

  const title = formString(formData, "title");
  if (!title) failStudent(goal.studentId, "Goal title is required.");

  const subjectId = formString(formData, "subjectId");
  if (subjectId && !isUuid(subjectId)) {
    failStudent(goal.studentId, "Pick a valid subject.");
  }

  const statusRaw = formString(formData, "status");
  const status = statusRaw === "abandoned" ? "abandoned" : "active";

  await db
    .update(goals)
    .set({
      title,
      description: formString(formData, "description"),
      targetDate: formString(formData, "targetDate"),
      subjectId: subjectId && isUuid(subjectId) ? subjectId : null,
      visibility: parseNoteVisibility(formString(formData, "visibility")),
      status,
      updatedAt: new Date(),
    })
    .where(eq(goals.id, goalId));

  revalidateStudent(goal.studentId);
  redirect(`${studentPath(goal.studentId)}?saved=1`);
}

export async function addGoalStepAction(goalId: string, formData: FormData) {
  await requireRole("tutor");
  if (!isUuid(goalId)) redirect("/dashboard/students");

  const goal = await db.query.goals.findFirst({
    where: eq(goals.id, goalId),
    columns: { id: true, studentId: true },
    with: { steps: { columns: { orderIndex: true } } },
  });
  if (!goal) redirect("/dashboard/students");

  const title = formString(formData, "title");
  if (!title) failStudent(goal.studentId, "Step title is required.");

  const nextIndex =
    goal.steps.reduce((max, s) => Math.max(max, s.orderIndex), -1) + 1;

  await db.insert(goalSteps).values({
    goalId,
    title,
    orderIndex: nextIndex,
  });

  revalidateStudent(goal.studentId);
  redirect(`${studentPath(goal.studentId)}?saved=1`);
}

export async function toggleGoalStepAction(
  redirectTo: string,
  formData: FormData,
) {
  await requireRole("tutor");
  const stepId = formString(formData, "stepId");
  if (!isUuid(stepId)) redirect(redirectTo);

  const step = await db.query.goalSteps.findFirst({
    where: eq(goalSteps.id, stepId),
    with: { goal: { columns: { studentId: true } } },
  });
  if (!step) redirect(redirectTo);

  const sessionId = formString(formData, "sessionId");
  const markDone = formString(formData, "completed") === "1";

  if (markDone) {
    await db
      .update(goalSteps)
      .set({
        completedAt: new Date(),
        completedInSessionId:
          sessionId && isUuid(sessionId) ? sessionId : null,
      })
      .where(eq(goalSteps.id, stepId));
  } else {
    await db
      .update(goalSteps)
      .set({ completedAt: null, completedInSessionId: null })
      .where(eq(goalSteps.id, stepId));
  }

  revalidatePath(redirectTo);
  revalidateStudent(step.goal.studentId);
  redirect(`${redirectTo}?saved=1`);
}

export async function deleteGoalStepAction(stepId: string) {
  await requireRole("tutor");
  if (!isUuid(stepId)) redirect("/dashboard/students");

  const step = await db.query.goalSteps.findFirst({
    where: eq(goalSteps.id, stepId),
    with: {
      goal: {
        columns: { studentId: true },
        with: { steps: { columns: { id: true } } },
      },
    },
  });
  if (!step) redirect("/dashboard/students");

  if (step.goal.steps.length <= 1) {
    failStudent(step.goal.studentId, "A goal needs at least one step.");
  }

  await db.delete(goalSteps).where(eq(goalSteps.id, stepId));
  revalidateStudent(step.goal.studentId);
  redirect(`${studentPath(step.goal.studentId)}?saved=1`);
}

export async function deleteGoalAction(goalId: string) {
  await requireRole("tutor");
  if (!isUuid(goalId)) redirect("/dashboard/students");

  const goal = await db.query.goals.findFirst({
    where: eq(goals.id, goalId),
    columns: { id: true, studentId: true },
  });
  if (!goal) redirect("/dashboard/students");

  await db.delete(goalSteps).where(eq(goalSteps.goalId, goalId));
  await db.delete(goals).where(eq(goals.id, goalId));

  revalidateStudent(goal.studentId);
  redirect(`${studentPath(goal.studentId)}?saved=1`);
}

// ---------------------------------------------------------------------------
// Assessments
// ---------------------------------------------------------------------------

export async function createAssessmentSeriesAction(
  studentId: string,
  formData: FormData,
) {
  await requireRole("tutor");
  if (!isUuid(studentId)) redirect("/dashboard/students");

  const name = formString(formData, "name");
  if (!name) failStudent(studentId, "Series name is required.");

  const subjectId = formString(formData, "subjectId");
  if (subjectId && !isUuid(subjectId)) {
    failStudent(studentId, "Pick a valid subject.");
  }

  await db.insert(assessmentSeries).values({
    studentId,
    name,
    description: formString(formData, "description"),
    subjectId: subjectId && isUuid(subjectId) ? subjectId : null,
    visibility: parseNoteVisibility(formString(formData, "visibility")),
  });

  revalidateStudent(studentId);
  redirect(`${studentPath(studentId)}?saved=1`);
}

export async function updateAssessmentSeriesAction(
  seriesId: string,
  formData: FormData,
) {
  await requireRole("tutor");
  if (!isUuid(seriesId)) redirect("/dashboard/students");

  const series = await db.query.assessmentSeries.findFirst({
    where: eq(assessmentSeries.id, seriesId),
    columns: { id: true, studentId: true },
  });
  if (!series) redirect("/dashboard/students");

  const name = formString(formData, "name");
  if (!name) failStudent(series.studentId, "Series name is required.");

  const subjectId = formString(formData, "subjectId");
  if (subjectId && !isUuid(subjectId)) {
    failStudent(series.studentId, "Pick a valid subject.");
  }

  await db
    .update(assessmentSeries)
    .set({
      name,
      description: formString(formData, "description"),
      subjectId: subjectId && isUuid(subjectId) ? subjectId : null,
      visibility: parseNoteVisibility(formString(formData, "visibility")),
    })
    .where(eq(assessmentSeries.id, seriesId));

  revalidateStudent(series.studentId);
  redirect(`${studentPath(series.studentId)}?saved=1`);
}

export async function deleteAssessmentSeriesAction(seriesId: string) {
  await requireRole("tutor");
  if (!isUuid(seriesId)) redirect("/dashboard/students");

  const series = await db.query.assessmentSeries.findFirst({
    where: eq(assessmentSeries.id, seriesId),
    columns: { id: true, studentId: true },
  });
  if (!series) redirect("/dashboard/students");

  await db.delete(assessments).where(eq(assessments.seriesId, seriesId));
  await db.delete(assessmentSeries).where(eq(assessmentSeries.id, seriesId));

  revalidateStudent(series.studentId);
  redirect(`${studentPath(series.studentId)}?saved=1`);
}

export async function createAssessmentAction(
  redirectTo: string,
  formData: FormData,
) {
  await requireRole("tutor");
  const seriesId = formString(formData, "seriesId");
  if (!isUuid(seriesId)) redirect(redirectTo);

  const series = await db.query.assessmentSeries.findFirst({
    where: eq(assessmentSeries.id, seriesId),
    columns: { id: true, studentId: true },
  });
  if (!series) redirect(redirectTo);

  const takenOn = formString(formData, "takenOn");
  if (!takenOn) {
    redirect(`${redirectTo}?error=${encodeURIComponent("Date is required.")}`);
  }

  const rawScore = formString(formData, "rawScore");
  const maxScore = formString(formData, "maxScore");
  if (rawScore === null || maxScore === null) {
    redirect(
      `${redirectTo}?error=${encodeURIComponent("Enter raw and max scores.")}`,
    );
  }
  const raw = Number(rawScore);
  const max = Number(maxScore);
  if (!Number.isFinite(raw) || raw < 0 || !Number.isFinite(max) || max <= 0) {
    redirect(
      `${redirectTo}?error=${encodeURIComponent("Scores must be numbers (max > 0).")}`,
    );
  }

  const sessionId = formString(formData, "sessionId");

  await db.insert(assessments).values({
    seriesId,
    takenOn,
    rawScore,
    maxScore,
    notes: formString(formData, "notes"),
    sessionId: sessionId && isUuid(sessionId) ? sessionId : null,
  });

  revalidatePath(redirectTo);
  revalidateStudent(series.studentId);
  redirect(`${redirectTo}?saved=1`);
}

export async function deleteAssessmentAction(
  redirectTo: string,
  formData: FormData,
) {
  await requireRole("tutor");
  const assessmentId = formString(formData, "assessmentId");
  if (!isUuid(assessmentId)) redirect(redirectTo);

  const row = await db.query.assessments.findFirst({
    where: eq(assessments.id, assessmentId),
    with: { series: { columns: { studentId: true } } },
  });
  if (!row) redirect(redirectTo);

  await db.delete(assessments).where(eq(assessments.id, assessmentId));
  revalidatePath(redirectTo);
  revalidateStudent(row.series.studentId);
  redirect(`${redirectTo}?saved=1`);
}

// ---------------------------------------------------------------------------
// Progress reports
// ---------------------------------------------------------------------------

export async function createProgressReportAction(
  studentId: string,
  formData: FormData,
) {
  await requireRole("tutor");
  if (!isUuid(studentId)) redirect("/dashboard/students");

  const periodStart = formString(formData, "periodStart");
  const periodEnd = formString(formData, "periodEnd");
  const summary = formString(formData, "summary");
  if (!periodStart || !periodEnd) {
    failStudent(studentId, "Report period start and end are required.");
  }
  if (periodStart > periodEnd) {
    failStudent(studentId, "Period start must be on or before period end.");
  }
  if (!summary) failStudent(studentId, "Write a short summary for the report.");

  const content = await buildReportContent(studentId, periodStart, periodEnd);

  const [report] = await db
    .insert(progressReports)
    .values({
      studentId,
      periodStart,
      periodEnd,
      summary,
      content,
    })
    .returning({ id: progressReports.id });

  revalidateStudent(studentId);
  redirect(`${studentPath(studentId)}/reports/${report.id}?saved=1`);
}

export async function sendProgressReportAction(reportId: string) {
  await requireRole("tutor");
  if (!isUuid(reportId)) redirect("/dashboard/students");

  const report = await db.query.progressReports.findFirst({
    where: eq(progressReports.id, reportId),
    with: { student: { columns: { id: true, name: true } } },
  });
  if (!report) redirect("/dashboard/students");

  const here = `${studentPath(report.studentId)}/reports/${reportId}`;
  if (report.sentAt) {
    redirect(`${here}?error=${encodeURIComponent("This report was already sent.")}`);
  }

  const links = await db.query.clientsStudents.findMany({
    where: eq(clientsStudents.studentId, report.studentId),
    with: { client: { columns: { name: true, email: true } } },
  });
  const recipients = links
    .map((l) => l.client)
    .filter((c): c is { name: string; email: string } => Boolean(c.email));

  if (recipients.length === 0) {
    redirect(
      `${here}?error=${encodeURIComponent("No linked clients with an email — add one before sending.")}`,
    );
  }

  const content = report.content as ReportContent;
  try {
    for (const client of recipients) {
      await sendEmail({
        ...progressReportEmail({
          studentName: report.student.name,
          clientName: client.name,
          periodStart: report.periodStart,
          periodEnd: report.periodEnd,
          summary: report.summary,
          content,
        }),
        to: client.email,
      });
    }
  } catch {
    redirect(
      `${here}?error=${encodeURIComponent("Couldn't send the report email. Try again.")}`,
    );
  }

  await db
    .update(progressReports)
    .set({ sentAt: new Date() })
    .where(eq(progressReports.id, reportId));

  revalidateStudent(report.studentId);
  revalidatePath(here);
  redirect(`${here}?saved=1`);
}

export async function deleteProgressReportAction(reportId: string) {
  await requireRole("tutor");
  if (!isUuid(reportId)) redirect("/dashboard/students");

  const report = await db.query.progressReports.findFirst({
    where: eq(progressReports.id, reportId),
    columns: { id: true, studentId: true, sentAt: true },
  });
  if (!report) redirect("/dashboard/students");

  if (report.sentAt) {
    failStudent(report.studentId, "Sent reports can't be deleted.");
  }

  await db.delete(progressReports).where(eq(progressReports.id, reportId));
  revalidateStudent(report.studentId);
  redirect(`${studentPath(report.studentId)}?saved=1`);
}

async function buildReportContent(
  studentId: string,
  periodStart: string,
  periodEnd: string,
): Promise<ReportContent> {
  const periodStartDt = new Date(`${periodStart}T00:00:00.000Z`);
  const periodEndDt = new Date(`${periodEnd}T23:59:59.999Z`);

  const [goalRows, seriesRows] = await Promise.all([
    db.query.goals.findMany({
      where: and(
        eq(goals.studentId, studentId),
        eq(goals.visibility, "shared"),
      ),
      with: {
        subject: { columns: { name: true } },
        steps: {
          orderBy: [asc(goalSteps.orderIndex)],
          columns: {
            title: true,
            completedAt: true,
          },
        },
      },
      orderBy: [asc(goals.orderIndex)],
    }),
    db.query.assessmentSeries.findMany({
      where: and(
        eq(assessmentSeries.studentId, studentId),
        eq(assessmentSeries.visibility, "shared"),
      ),
      with: {
        subject: { columns: { name: true } },
        assessments: {
          where: and(
            gte(assessments.takenOn, periodStart),
            lte(assessments.takenOn, periodEnd),
          ),
          orderBy: [asc(assessments.takenOn)],
          columns: {
            takenOn: true,
            rawScore: true,
            maxScore: true,
          },
        },
      },
    }),
  ]);

  const goalsContent = goalRows
    .map((g) => {
      const stepsCompleted = g.steps
        .filter(
          (s) =>
            s.completedAt &&
            s.completedAt >= periodStartDt &&
            s.completedAt <= periodEndDt,
        )
        .map((s) => ({
          title: s.title,
          completedAt: s.completedAt!.toISOString(),
        }));
      return {
        id: g.id,
        title: g.title,
        subjectName: g.subject?.name ?? null,
        stepsCompleted,
        allStepsCount: g.steps.length,
        complete: isGoalComplete(g.steps),
      };
    })
    .filter((g) => g.stepsCompleted.length > 0 || g.complete);

  const assessmentsContent = seriesRows
    .filter((s) => s.assessments.length > 0)
    .map((s) => ({
      seriesName: s.name,
      subjectName: s.subject?.name ?? null,
      points: s.assessments.map((a) => ({
        takenOn: a.takenOn,
        rawScore: a.rawScore,
        maxScore: a.maxScore,
      })),
    }));

  return { goals: goalsContent, assessments: assessmentsContent };
}
