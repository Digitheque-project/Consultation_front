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

  // NEXT_PUBLIC_AUTH_CLIENT_URL non renseignée au build → AUTH_CLIENT_URL vide.
  // NextResponse.redirect("") lève "Invalid URL", et comme ce middleware
  // s'exécute sur CHAQUE requête, ça rendrait tout le site inaccessible (500)
  // au lieu de dégrader seulement la connexion. On laisse donc passer la
  // requête : la page cliente affichera l'erreur de configuration déjà
  // journalisée par checkPublicEnv.
  const redirectToAuth = (): NextResponse => {
    if (!AUTH_CLIENT_URL) return NextResponse.next();
    return NextResponse.redirect(AUTH_CLIENT_URL);
  };

  // Racine → dashboard si connecté, sinon auth service
  if (pathname === "/") {
    if (authToken) {
      return NextResponse.redirect(new URL(DASHBOARD, request.url));
    }
    return redirectToAuth();
  }

  // Routes protégées sans token → auth service
  if (isProtectedPathname(pathname) && !authToken) {
    return redirectToAuth();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
