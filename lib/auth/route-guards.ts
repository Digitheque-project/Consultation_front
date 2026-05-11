/**
 * Path prefixes that require a mock session cookie.
 * Keep in sync with real route modules; used by middleware only.
 */
const PROTECTED_PREFIXES = [
  "/modules",
  "/patient",
  "/clinical-dashboard",
  "/admin-dashboard",
  "/billing-dashboard",
  "/consultation",
  "/control",
  "/archive",
] as const;

export function isProtectedPathname(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
