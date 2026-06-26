import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, MOCK_AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import {
  decodeMockSession,
  getModuleHomePath,
} from "@/lib/auth/mock-session";
import { isProtectedPathname } from "@/lib/auth/route-guards";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionRaw = request.cookies.get(MOCK_AUTH_COOKIE_NAME)?.value;
  const authToken =
    request.cookies.get(AUTH_COOKIE_NAME)?.value ||
    request.cookies.get("auth_token")?.value ||
    request.cookies.get("access_token")?.value;
  const session = decodeMockSession(sessionRaw);
  const hasActiveSession = Boolean(authToken || sessionRaw);

  if (pathname === "/") {
    if (hasActiveSession) {
      return NextResponse.redirect(new URL("/modules/consultation-externe", request.url));
    }
    return NextResponse.redirect(new URL("/select-profile", request.url));
  }

  if (pathname.startsWith("/login") || pathname.startsWith("/select-profile")) {
    if (hasActiveSession) {
      return NextResponse.redirect(new URL("/modules/consultation-externe", request.url));
    }
    return NextResponse.next();
  }

  if (!isProtectedPathname(pathname)) {
    return NextResponse.next();
  }

  if (!hasActiveSession) {
    const login = new URL("/select-profile", request.url);
    login.searchParams.set("from", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
