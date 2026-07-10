import { sql } from "drizzle-orm";
import { engagements, engagementSubjects, subjects } from "@/db/schema";

// Comma-joined subject names for an engagement loaded via the relational API
// (engagementSubjects: { with: { subject: true } }). Alphabetical so the same
// engagement always renders the same string.
export function subjectNames(links: { subject: { name: string } }[]): string {
  return links
    .map((l) => l.subject.name)
    .sort((a, b) => a.localeCompare(b))
    .join(", ");
}

// The same list as a SQL scalar for raw selects, correlated on the query's
// joined `engagements` row (replaces the old single-subject join).
export const subjectNamesSql = sql<string>`(
  select coalesce(string_agg(${subjects.name}, ', ' order by ${subjects.name}), '')
  from ${engagementSubjects}
  join ${subjects} on ${subjects.id} = ${engagementSubjects.subjectId}
  where ${engagementSubjects.engagementId} = ${engagements.id}
)`;
