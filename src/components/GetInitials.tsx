export const GetInitials = (first = "", last = "") => {
  const firstInitial = first?.trim()?.charAt(0)?.toUpperCase() || "";
  const lastInitial = last?.trim()?.charAt(0)?.toUpperCase() || "";
  return firstInitial + lastInitial;
};
