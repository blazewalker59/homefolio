import { describe, it, expect } from "vite-plus/test";
import { deriveUsername } from "@/lib/auth/username";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";
import type * as schema from "@/db/schema";

type DB = NeonDatabase<typeof schema>;

/**
 * Build a fake Drizzle query chain whose terminal `.limit()` resolves to a
 * set of rows. `deriveUsername` only ever calls
 * `db.select(...).from(...).where(...).limit(1)`, so we stub exactly that
 * chain. `isTakenFor(callIndex)` decides, per lookup, whether the candidate
 * is reported as already used — lookups happen in candidate order.
 */
function fakeDb(isTakenFor: (callIndex: number) => boolean): DB {
  let call = 0;
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => {
            const taken = isTakenFor(call);
            call += 1;
            return Promise.resolve(taken ? [{ id: "x" }] : []);
          },
        }),
      }),
    }),
  } as unknown as DB;
}

describe("deriveUsername", () => {
  it("derives a kebab username from the email local-part", async () => {
    const db = fakeDb(() => false);
    const username = await deriveUsername(db, {
      id: "abc12345-0000-0000-0000-000000000000",
      email: "Jane.Doe@example.com",
      name: "Jane Doe",
    });
    expect(username).toBe("jane-doe");
  });

  it("falls back to the uuid prefix when there is no email", async () => {
    const db = fakeDb(() => false);
    const username = await deriveUsername(db, {
      id: "abcdef12-3456-7890-0000-000000000000",
      email: null,
      name: null,
    });
    expect(username).toBe("abcdef12");
  });

  it("appends a uuid suffix when the base is taken", async () => {
    const id = "abcdef12-3456-7890-0000-000000000000";
    // First lookup (base "jane") is taken; second (suffixed) is free.
    const db = fakeDb((callIndex) => callIndex === 0);
    const username = await deriveUsername(db, {
      id,
      email: "jane@example.com",
      name: "Jane",
    });
    expect(username).toBe(`jane-${id.replace(/-/g, "").slice(0, 6)}`);
  });
});
