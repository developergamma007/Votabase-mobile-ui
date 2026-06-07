/** Only platform Super Admin logins are read-only in Add/Manage Volunteer flows. */
export function isProtectedVolunteerLogin(volunteer: Record<string, unknown> = {}) {
  const level = String(volunteer.workingLevel || volunteer.assignmentType || "").toUpperCase();
  const role = String(volunteer.role || "").replace(/^ROLE_/, "").toUpperCase();
  return level === "SUPER_ADMIN" || role === "SUPER_ADMIN";
}

/** @deprecated Use isProtectedVolunteerLogin */
export const isAssemblyOrWardVolunteerLogin = isProtectedVolunteerLogin;
