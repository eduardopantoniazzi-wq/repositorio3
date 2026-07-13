import { NextRequest, NextResponse } from "next/server";

// Optimistic check only: reads the session cookie's mere presence, without
// hitting the database. Real authorization (role checks, and verifying the
// session still corresponds to an active user) happens in the DAL
// (src/lib/dal.ts) on every server action and page — this just avoids
// flashing protected pages before redirecting to /login.
//
// Deliberately does NOT redirect away from /login just because a cookie is
// present: the cookie's mere presence doesn't mean it's still valid (the
// underlying user may have been deactivated, or the database reset under
// it), and cookies can't be cleared from here or from a page render — only
// from a Server Action/Route Handler. Bouncing away from /login on stale
// cookies would trap the user in a redirect loop with no way back to the
// login form. The login page itself redirects an already-valid session to
// "/" (see src/app/login/page.tsx), which is safe because it goes through
// the DAL's real DB check.
const COOKIE_NAME = "wms_session";
const PUBLIC_PATHS = ["/login"];

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const hasSession = Boolean(req.cookies.get(COOKIE_NAME)?.value);

  if (!isPublic && !hasSession) {
    const url = new URL("/login", req.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
