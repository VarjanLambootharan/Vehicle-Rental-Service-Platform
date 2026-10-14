/** The role is the current identity returned by /auth/me, never a browser preference. */
export function authRedirect(role: string, from?: string): string {
  if (role === "ADMIN") return "/admin";
  if (
    from &&
    /^\/(?:$|(?:vehicles|bookings|payments|reviews|profile|dashboard|notifications)(?:\/|\?|$))/.test(
      from,
    )
  )
    return from;
  return "/dashboard";
}
