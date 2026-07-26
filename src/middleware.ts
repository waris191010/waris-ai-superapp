import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/session";

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  const { pathname } = req.nextUrl;

  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isAuthPage = pathname === "/login" || pathname === "/register";

  if (isDashboardRoute && !session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && session) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register"],
};
