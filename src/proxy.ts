import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Optimistic redirect based on cookie presence only — the cookie is not
// validated here. Actual session validation happens in requireUser()
// (src/lib/session.ts) on every protected server render.
export default function proxy(request: NextRequest) {
  const isLoggedIn = getSessionCookie(request) !== null;
  const { pathname } = request.nextUrl;

  if (
    !isLoggedIn &&
    (pathname.startsWith("/dashboard") || pathname.startsWith("/portal"))
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (isLoggedIn && pathname === "/login") {
    // Cookie-only here — the actual role split (dashboard vs portal) happens
    // server-side: /dashboard bounces non-tutors to /portal via requireRole.
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/portal/:path*", "/login"],
};
