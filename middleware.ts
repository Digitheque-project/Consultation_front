import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, AUTH_CLIENT_URL } from "@/lib/auth/constants";
import { isProtectedPathname } from "@/lib/auth/route-guards";
const DASHBOARD = "/modules/consultation-externe/dashboard";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Interception du token SSO après redirection depuis le service auth
  // Le service auth envoie ?accessToken= (camelCase) ou ?accesstoken= (lowercase)
  const urlToken =
    request.nextUrl.searchParams.get("accessToken") ||
    request.nextUrl.searchParams.get("accesstoken");
  if (urlToken) {
    const destination = pathname === "/" ? DASHBOARD : pathname;
    const response = NextResponse.redirect(new URL(destination, request.url));
    response.cookies.set(AUTH_COOKIE_NAME, urlToken, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    });
    return response;
  }

  const authToken =
    request.cookies.get(AUTH_COOKIE_NAME)?.value ||
    request.cookies.get("auth_token")?.value ||
    request.cookies.get("access_token")?.value;

  // Racine → dashboard si connecté, sinon auth service
  if (pathname === "/") {
    if (authToken) {
      return NextResponse.redirect(new URL(DASHBOARD, request.url));
    }
    return NextResponse.redirect(AUTH_CLIENT_URL);
  }

  // Routes protégées sans token → auth service
  if (isProtectedPathname(pathname) && !authToken) {
    return NextResponse.redirect(AUTH_CLIENT_URL);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
