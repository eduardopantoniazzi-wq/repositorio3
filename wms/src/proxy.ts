import { NextRequest, NextResponse } from "next/server";

// Optimistic check only: reads the session cookie without hitting the
// database. Real authorization (role checks) happens in the DAL
// (src/lib/dal.ts) on every server action and page — this just avoids
// flashing protected pages before redirecting to /login.
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

  if (isPublic && hasSession) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
