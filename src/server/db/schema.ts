import type { HouseholdLanguage, HouseholdUnits } from "@shared/household";
import type { ImportedRecipe } from "@shared/recipe-import";
import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestamp = (name: string) => integer(name, { mode: "timestamp_ms" });
const createdAt = () =>
  timestamp("created_at")
    .default(sql`(unixepoch() * 1000)`)
    .notNull();
const updatedAt = () =>
  timestamp("updated_at")
    .default(sql`(unixepoch() * 1000)`)
    .notNull();

export const users = sqliteTable(
  "user",
  {
    id: text().primaryKey(),
    name: text().notNull(),
    email: text().notNull(),
    emailVerified: integer("email_verified", { mode: "boolean" }).default(false).notNull(),
    image: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex("user_email_unique").on(table.email)],
);

export const sessions = sqliteTable(
  "session",
  {
    id: text().primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("session_token_unique").on(table.token),
    index("session_user_id_idx").on(table.userId),
  ],
);

export const accounts = sqliteTable(
  "account",
  {
    id: text().primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text(),
    password: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("account_provider_account_unique").on(table.providerId, table.accountId),
    index("account_user_id_idx").on(table.userId),
  ],
);

export const verifications = sqliteTable(
  "verification",
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const households = sqliteTable("household", {
  id: text().primaryKey(),
  name: text().notNull(),
  // See householdLanguages and householdUnits in @shared/household.
  language: text().$type<HouseholdLanguage>().default("en").notNull(),
  units: text().$type<HouseholdUnits>().default("metric").notNull(),
  createdAt: createdAt(),
});

// The user ID primary key enforces one household per user.
export const householdMembers = sqliteTable(
  "household_member",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    householdId: text("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    role: text({ enum: ["owner", "member"] }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [index("household_member_household_id_idx").on(table.householdId)],
);

// Each household has one active invite link; resetting it replaces the token.
export const householdInvites = sqliteTable(
  "household_invite",
  {
    householdId: text("household_id")
      .primaryKey()
      .references(() => households.id, { onDelete: "cascade" }),
    token: text().notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (table) => [uniqueIndex("household_invite_token_unique").on(table.token)],
);

// Recipe imports a Workflow is still working on, or that failed. The importer's browser saves a
// finished import as a recipe, then deletes its row. The ID becomes the recipe's ID.
export const recipeImports = sqliteTable(
  "recipe_import",
  {
    id: text().primaryKey(),
    householdId: text("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text({ enum: ["page", "photos"] }).notNull(),
    status: text({ enum: ["reading", "writing", "ready", "failed"] }).notNull(),
    // The link as entered, then the page it led to.
    sourceUrl: text("source_url"),
    // Uploaded photos of the recipe, as a JSON array of photo IDs.
    sourcePhotoIds: text("source_photo_ids", { mode: "json" }).$type<string[]>(),
    // Known once the page is read, to show while the recipe is written.
    title: text(),
    // The page's shared image, which becomes the recipe's photo.
    photoId: text("photo_id"),
    // The finished recipe, as ImportedRecipe JSON.
    recipe: text({ mode: "json" }).$type<ImportedRecipe>(),
    error: text(),
    // The Workflow instance running the latest attempt, so it can be stopped.
    runId: text("run_id").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("recipe_import_user_id_idx").on(table.userId)],
);
