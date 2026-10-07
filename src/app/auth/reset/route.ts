import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/jwt";

// Valid token but the user no longer exists (e.g. an expired demo account):
// clear the cookie, otherwise proxy.ts and the DAL would redirect to each other forever.
export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
