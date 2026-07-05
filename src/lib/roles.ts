// Roles are not stored in the database. A user holds a role iff the
// corresponding record links to them:
//   tutor   — a row in `tutors` with their user_id
//   client  — a row in `users_clients` with their user_id
//   student — a row in `students` with their user_id
export const ROLES = ["tutor", "client", "student"] as const;

export type Role = (typeof ROLES)[number];
