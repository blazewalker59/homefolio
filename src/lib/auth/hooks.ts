/**
 * Auth hooks facade.
 *
 * Single place the rest of the app imports auth state from. Exposes:
 *   - useAuth() — { status, user, session }
 *   - useUser() — the user or null
 *   - signOut() — clears the session
 *   - signInWithGoogle() — kicks off Google OAuth
 *
 * State shape:
 *   - status: "loading" while Better Auth's initial session fetch is in
 *     flight, then "authenticated" or "anonymous".
 *   - user: the Better Auth user (with our `username` / `displayName` /
 *     `avatarUrl` additional fields) or null when anonymous.
 *   - session: the full session object or null.
 */

import { authClient, useSession } from "./client";

export type AuthStatus = "loading" | "authenticated" | "anonymous";

type BetterAuthSession = ReturnType<typeof useSession>["data"];
type SessionUser = NonNullable<BetterAuthSession>["user"];
type SessionRecord = NonNullable<BetterAuthSession>["session"];

export interface AuthState {
  status: AuthStatus;
  user: SessionUser | null;
  session: SessionRecord | null;
}

/** Returns the current auth state and re-renders on changes. */
export function useAuth(): AuthState {
  const { data, isPending } = useSession();
  if (isPending) return { status: "loading", user: null, session: null };
  if (!data) return { status: "anonymous", user: null, session: null };
  return { status: "authenticated", user: data.user, session: data.session };
}

/** Convenience: returns just the user, or null. */
export function useUser(): SessionUser | null {
  return useAuth().user;
}

/**
 * Sign out the current user. Better Auth clears the session cookie and
 * the in-memory nanostore, which triggers a re-render through `useSession`.
 * After sign-out we navigate to `/sign-in` so the user sees a clear
 * logged-out state.
 */
export async function signOut(): Promise<void> {
  await authClient.signOut({
    fetchOptions: {
      onSuccess: () => {
        window.location.href = "/sign-in";
      },
    },
  });
}

/**
 * Kick off Google OAuth. Better Auth redirects to Google, then back to
 * `/api/auth/callback/google`, which our Better Auth server handler picks
 * up. `callbackURL` is where Better Auth bounces the browser after a
 * successful sign-in — we land on `/` (the dashboard).
 */
export async function signInWithGoogle(): Promise<void> {
  const { error } = await authClient.signIn.social({
    provider: "google",
    callbackURL: "/",
  });
  if (error) {
    throw new Error(error.message ?? "Google sign-in failed");
  }
}
