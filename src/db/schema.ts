import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export interface TemplateField {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "boolean";
  options?: string[];
  required?: boolean;
}

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
// Home
//
// The single property a user has claimed. One user, one home (multi-home and
// shared access are deferred). Auto-created on first sign-in via a database
// hook in `src/lib/auth/server.ts`. All property facts are nullable — the user
// fills them in during manual setup (Slice 2) or via property data API
// (Slice 12). Archive fields (soldAt, salePrice) are set when the user marks
// the home as sold (Slice 16).
// ──────────────────────────────────────────────────────────────────────────────

export const homes = pgTable(
  "homes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
      .unique(),
    name: text("name"),
    address: text("address"),
    yearBuilt: integer("year_built"),
    sqft: integer("sqft"),
    lotSize: numeric("lot_size", { precision: 10, scale: 2 }),
    bedCount: integer("bed_count"),
    bathCount: integer("bath_count"),
    purchasePrice: numeric("purchase_price", { precision: 12, scale: 2 }),
    purchaseDate: timestamp("purchase_date", { withTimezone: true }),
    soldAt: timestamp("sold_at", { withTimezone: true }),
    salePrice: numeric("sale_price", { precision: 12, scale: 2 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("homes_user_idx").on(t.userId)],
);

// ──────────────────────────────────────────────────────────────────────────────
// Room
//
// A physical space within a home. Each room has a category from a configurable
// list (Bedroom, Bathroom, Kitchen, etc.) and a user-provided name. Rooms are
// ordered by sort_order. Orphan protection: rooms cannot be deleted if they
// contain items or documents.
// ──────────────────────────────────────────────────────────────────────────────

export const rooms = pgTable(
  "rooms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    homeId: uuid("home_id")
      .notNull()
      .references(() => homes.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("rooms_home_idx").on(t.homeId)],
);

// ──────────────────────────────────────────────────────────────────────────────
// System
//
// A home system (HVAC, electrical, plumbing, water heater, etc.). Systems can
// have sub-units (e.g., "Upstairs Unit", "Downstairs Unit" for HVAC). Orphan
// protection: systems cannot be deleted if they contain sub-units or items.
// ──────────────────────────────────────────────────────────────────────────────

export const systems = pgTable(
  "systems",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    homeId: uuid("home_id")
      .notNull()
      .references(() => homes.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("systems_home_idx").on(t.homeId)],
);

// ──────────────────────────────────────────────────────────────────────────────
// System Unit
//
// A sub-unit within a system (e.g., "Upstairs Unit" for an HVAC system).
// Units belong to a system and cascade-delete with it.
// ──────────────────────────────────────────────────────────────────────────────

export const systemUnits = pgTable(
  "system_units",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    systemId: uuid("system_id")
      .notNull()
      .references(() => systems.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("system_units_system_idx").on(t.systemId)],
);

// ──────────────────────────────────────────────────────────────────────────────
// Item Template
//
// Templates define the structure for items. Built-in templates (paint, window,
// outlet, furniture, air filter) are seeded at startup. Each template has a
// `fields` JSON column that defines the schema for items created from it.
// Items snapshot the template at creation — editing a template doesn't change
// existing items.
// ──────────────────────────────────────────────────────────────────────────────

export const itemTemplates = pgTable(
  "item_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    description: text("description"),
    fields: jsonb("fields").notNull().$type<TemplateField[]>(),
    isBuiltIn: boolean("is_built_in").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("item_templates_category_idx").on(t.category)],
);

// ──────────────────────────────────────────────────────────────────────────────
// Item
//
// A physical item in the home. Items are created from templates and snapshot
// the template's fields at creation time. An item can belong to a Room, a
// System (or sub-unit), or both (dual membership). Moving an item between
// rooms generates an activity entry (placeholder for Slice 9). Orphan
// protection: items cannot be deleted if they have attached documents.
// ──────────────────────────────────────────────────────────────────────────────

export const items = pgTable(
  "items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    homeId: uuid("home_id")
      .notNull()
      .references(() => homes.id, { onDelete: "cascade" }),
    templateId: uuid("template_id")
      .notNull()
      .references(() => itemTemplates.id),
    name: text("name").notNull(),
    roomId: uuid("room_id").references(() => rooms.id, { onDelete: "set null" }),
    systemUnitId: uuid("system_unit_id").references(() => systemUnits.id, {
      onDelete: "set null",
    }),
    fields: jsonb("fields").notNull().$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("items_home_idx").on(t.homeId),
    index("items_room_idx").on(t.roomId),
    index("items_system_unit_idx").on(t.systemUnitId),
  ],
);

// ──────────────────────────────────────────────────────────────────────────────
// Relations
// ──────────────────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many, one }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  home: one(homes, { fields: [users.id], references: [homes.userId] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const homesRelations = relations(homes, ({ one, many }) => ({
  user: one(users, { fields: [homes.userId], references: [users.id] }),
  rooms: many(rooms),
  systems: many(systems),
  items: many(items),
}));

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  home: one(homes, { fields: [rooms.homeId], references: [homes.id] }),
  items: many(items),
}));

export const systemsRelations = relations(systems, ({ one, many }) => ({
  home: one(homes, { fields: [systems.homeId], references: [homes.id] }),
  units: many(systemUnits),
}));

export const systemUnitsRelations = relations(systemUnits, ({ one, many }) => ({
  system: one(systems, { fields: [systemUnits.systemId], references: [systems.id] }),
  items: many(items),
}));

export const itemTemplatesRelations = relations(itemTemplates, ({ many }) => ({
  items: many(items),
}));

export const itemsRelations = relations(items, ({ one }) => ({
  home: one(homes, { fields: [items.homeId], references: [homes.id] }),
  template: one(itemTemplates, { fields: [items.templateId], references: [itemTemplates.id] }),
  room: one(rooms, { fields: [items.roomId], references: [rooms.id] }),
  systemUnit: one(systemUnits, { fields: [items.systemUnitId], references: [systemUnits.id] }),
}));
