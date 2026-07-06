import { type NextRequest, NextResponse } from "next/server";

/**
 * Lightweight middleware — no session refresh needed.
 * Auth is handled via environment variables, not database sessions.
 * This middleware simply passes all requests through.
 */
export const updateSession = async (request: NextRequest) => {
  return NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
};
