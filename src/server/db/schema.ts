import type { HouseholdLanguage, HouseholdUnits } from "@shared/household";
import type { ImportedRecipe } from "@shared/recipe-import";
import type { RecipeBase, RecipeEffort, RecipeProtein } from "@shared/recipe-profile";
import type { RecipeSection } from "@shared/recipes";
import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

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

// Recipe imports a Workflow is still working on, or that failed. The Workflow saves a finished
// import as a recipe under the same ID; its row stays until the importer's app has announced it.
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

// A household's recipes. Deleting one takes its tags, favorites, profile, and planned meals too.
export const recipes = sqliteTable(
  "recipe",
  {
    id: text().primaryKey(),
    householdId: text("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    title: text().notNull(),
    description: text(),
    servings: integer(),
    // An uploaded photo's URL (see recipePhotoUrl), or any image elsewhere.
    imageUrl: text("image_url"),
    // The page an imported recipe came from.
    sourceUrl: text("source_url"),
    ingredients: text({ mode: "json" }).$type<RecipeSection[]>().notNull(),
    instructions: text({ mode: "json" }).$type<RecipeSection[]>().notNull(),
    // User IDs without a foreign key: a recipe outlives the member who wrote it.
    createdBy: text("created_by").notNull(),
    updatedBy: text("updated_by").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    // When a read for the recipe's profile last began, whether or not it worked. See
    // src/server/recipe-profile/profiles.ts.
    profileCheckedAt: timestamp("profile_checked_at"),
  },
  (table) => [index("recipe_household_id_idx").on(table.householdId)],
);

// Tags belong to the household, so renaming one updates every recipe that uses it.
export const tags = sqliteTable(
  "tag",
  {
    id: text().primaryKey(),
    householdId: text("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    name: text().notNull(),
    createdAt: createdAt(),
  },
  (table) => [index("tag_household_id_idx").on(table.householdId)],
);

export const recipeTags = sqliteTable(
  "recipe_tag",
  {
    recipeId: text("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.recipeId, table.tagId] }),
    index("recipe_tag_tag_id_idx").on(table.tagId),
  ],
);

// Each member's own favorites.
export const favorites = sqliteTable(
  "favorite",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipeId: text("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    favoritedAt: timestamp("favorited_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.recipeId] }),
    index("favorite_recipe_id_idx").on(table.recipeId),
  ],
);

// What meal suggestions know about a recipe; see @shared/recipe-profile.
export const recipeProfiles = sqliteTable("recipe_profile", {
  recipeId: text("recipe_id")
    .primaryKey()
    .references(() => recipes.id, { onDelete: "cascade" }),
  isDinner: integer("is_dinner", { mode: "boolean" }).notNull(),
  base: text().$type<RecipeBase>().notNull(),
  protein: text().$type<RecipeProtein>().notNull(),
  effort: text().$type<RecipeEffort>().notNull(),
  isTreat: integer("is_treat", { mode: "boolean" }).notNull(),
  version: integer().notNull(),
  sourceHash: text("source_hash").notNull(),
  profiledAt: timestamp("profiled_at").notNull(),
});

// One dinner a day for each household, on local calendar dates like "2026-10-12".
export const plannedMeals = sqliteTable(
  "planned_meal",
  {
    householdId: text("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    date: text().notNull(),
    recipeId: text("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    // Set on suggested meals: the suggestion that planned it, for undoing it as a whole.
    suggestionId: text("suggestion_id"),
    plannedBy: text("planned_by").notNull(),
    plannedAt: timestamp("planned_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.householdId, table.date] }),
    index("planned_meal_recipe_id_idx").on(table.recipeId),
  ],
);
