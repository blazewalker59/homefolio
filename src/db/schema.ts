import { relations } from "drizzle-orm";
import { boolean, index, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

// ──────────────────────────────────────────────────────────────────────────────
// Auth tables (Better Auth core schema)
//
// Better Auth canonical table names are singular (user, session, account,
// verification). We keep plural `users`/`sessions`/etc. and let the adapter
// map Better Auth's singular model names to those tables via `usePlural: true`
// in `src/lib/auth/server.ts`.
//
// We configure Better Auth to generate UUIDs (advanced.database.generateId)
// so all `id` columns stay `uuid`. That's a big simplification vs flipping
// everything to text.
//
// Our application-specific user fields (`username`, `display_name`,
// `avatar_url`) live on this table as Better Auth `additionalFields`. The
// username is derived in a `databaseHooks.user.create.before` hook on first
// sign-in.
// ──────────────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  // Better Auth writes this; we declare it NOT NULL + PK.
  id: uuid("id").primaryKey().defaultRandom(),
  // Better Auth core fields.
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  // Our app fields.
  username: text("username").notNull().unique(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Better Auth `session` table. One row per live session cookie.
 * Sessions cascade-delete with the user. Expired rows are swept by
 * Better Auth itself on each `getSession()` call.
 */
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

/**
 * Better Auth `account` table. One row per (user, oauth-provider) link
 * — e.g. a Google account connected to a Homefolio user. For email/password
 * auth this is where the password hash would live; we don't use that.
 */
export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    idToken: text("id_token"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("accounts_user_idx").on(t.userId),
    unique("accounts_provider_uq").on(t.providerId, t.accountId),
  ],
);

/**
 * Better Auth `verification` table. Short-lived rows used for email
 * verification, password reset, and OAuth state. Not user-cascaded — rows
 * are transient and Better Auth cleans them up by `expiresAt`.
 */
export const verifications = pgTable(
  "verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("verifications_identifier_idx").on(t.identifier)],
);

// ──────────────────────────────────────────────────────────────────────────────
// Relations
// ──────────────────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));
