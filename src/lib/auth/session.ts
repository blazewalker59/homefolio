/**
 * Server-side session reader.
 *
 * This is the single gate server functions use to identify the caller. It
 * pulls cookies off the current request, hands them to Better Auth's
 * session API, and returns the matched user (or `null` for anonymous
 * callers).
 *
 * Must ONLY be imported from server code (server functions, middleware,
 * route loaders). Importing from a client bundle will throw because
 * `getRequest()` requires a running request context.
 */

import { getRequest } from "@tanstack/react-start/server";
import { getAuth } from "./server";

/**
 * Resolve the authenticated user for the current request, or `null`.
 *
 * Never throws on missing cookies — "no session" is a normal result that
 * server functions translate into "render sign-in CTA" or "401".
 */
export async function getSessionUser() {
  const auth = await getAuth();
  const request = getRequest();
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  return session?.user ?? null;
}

/**
 * Convenience for server fns that require a signed-in user. Throws a
 * recognisable `Error` when the caller is anonymous so the surrounding
 * `createServerFn` handler surfaces a 500 → client maps to sign-in prompt.
 * Use this when the only correct behaviour is to fail fast (writes, etc);
 * for reads prefer `getSessionUser()` + nullable return so the UI can show
 * an anonymous experience.
 */
export async function requireSessionUser() {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("Not authenticated");
  }
  return user;
}
