import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { MOCK_AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import {
  decodeMockSession,
  getModuleHomePath,
} from "@/lib/auth/mock-session";
import { isProtectedPathname } from "@/lib/auth/route-guards";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionRaw = request.cookies.get(MOCK_AUTH_COOKIE_NAME)?.value;
  const session = decodeMockSession(sessionRaw);

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname.startsWith("/login")) {
    if (session) {
      const target = new URL(getModuleHomePath(session.module), request.url);
      return NextResponse.redirect(target);
    }
    return NextResponse.next();
  }

  if (!isProtectedPathname(pathname)) {
    return NextResponse.next();
  }

  if (!session) {
    const login = new URL("/login", request.url);
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
