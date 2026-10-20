import type { HouseholdLanguage, HouseholdUnits } from "@shared/household";
import type { ImportedRecipe } from "@shared/recipe-import";
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

// OAuth, for MCP clients like Claude. Better Auth's JWT and MCP plugins own these tables
// (see src/server/auth/auth.ts). Its adapter stores lists and JSON as text in SQLite.

// Keys that sign access tokens.
export const jwks = sqliteTable("jwks", {
  id: text().primaryKey(),
  publicKey: text("public_key").notNull(),
  privateKey: text("private_key").notNull(),
  createdAt: timestamp("created_at").notNull(),
  expiresAt: timestamp("expires_at"),
  alg: text(),
  crv: text(),
});

// Apps that registered themselves to ask for access, such as Claude.
export const oauthClients = sqliteTable(
  "oauth_client",
  {
    id: text().primaryKey(),
    clientId: text("client_id").notNull(),
    clientSecret: text("client_secret"),
    clientDiscoveryId: text("client_discovery_id"),
    disabled: integer({ mode: "boolean" }).default(false),
    skipConsent: integer("skip_consent", { mode: "boolean" }),
    enableEndSession: integer("enable_end_session", { mode: "boolean" }),
    subjectType: text("subject_type"),
    scopes: text(),
    clientCredentialsScopes: text("client_credentials_scopes"),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
    name: text(),
    uri: text(),
    icon: text(),
    contacts: text(),
    tos: text(),
    policy: text(),
    softwareId: text("software_id"),
    softwareVersion: text("software_version"),
    softwareStatement: text("software_statement"),
    redirectUris: text("redirect_uris").notNull(),
    postLogoutRedirectUris: text("post_logout_redirect_uris"),
    backchannelLogoutUri: text("backchannel_logout_uri"),
    backchannelLogoutSessionRequired: integer("backchannel_logout_session_required", {
      mode: "boolean",
    }),
    tokenEndpointAuthMethod: text("token_endpoint_auth_method"),
    applicationType: text("application_type"),
    jwks: text(),
    jwksUri: text("jwks_uri"),
    grantTypes: text("grant_types"),
    responseTypes: text("response_types"),
    requirePKCE: integer("require_pkce", { mode: "boolean" }),
    dpopBoundAccessTokens: integer("dpop_bound_access_tokens", { mode: "boolean" }).default(false),
    referenceId: text("reference_id"),
    metadata: text(),
  },
  (table) => [
    uniqueIndex("oauth_client_client_id_unique").on(table.clientId),
    index("oauth_client_user_id_idx").on(table.userId),
  ],
);

// APIs that tokens are issued for. The MCP plugin adds /mcp when the Worker starts.
export const oauthResources = sqliteTable(
  "oauth_resource",
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    name: text().notNull(),
    accessTokenTtl: integer("access_token_ttl"),
    refreshTokenTtl: integer("refresh_token_ttl"),
    signingAlgorithm: text("signing_algorithm"),
    signingKeyId: text("signing_key_id"),
    allowedScopes: text("allowed_scopes"),
    customClaims: text("custom_claims"),
    dpopBoundAccessTokensRequired: integer("dpop_bound_access_tokens_required", {
      mode: "boolean",
    }).default(false),
    disabled: integer({ mode: "boolean" }).default(false),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
    policyVersion: integer("policy_version").default(1),
    metadata: text(),
  },
  (table) => [uniqueIndex("oauth_resource_identifier_unique").on(table.identifier)],
);

export const oauthClientResources = sqliteTable(
  "oauth_client_resource",
  {
    id: text().primaryKey(),
    clientId: text("client_id")
      .notNull()
      .references(() => oauthClients.clientId, { onDelete: "cascade" }),
    resourceId: text("resource_id")
      .notNull()
      .references(() => oauthResources.identifier, { onDelete: "cascade" }),
    metadata: text(),
    createdAt: timestamp("created_at"),
  },
  (table) => [
    index("oauth_client_resource_client_id_idx").on(table.clientId),
    index("oauth_client_resource_resource_id_idx").on(table.resourceId),
  ],
);

export const oauthRefreshTokens = sqliteTable(
  "oauth_refresh_token",
  {
    id: text().primaryKey(),
    token: text().notNull(),
    clientId: text("client_id")
      .notNull()
      .references(() => oauthClients.clientId, { onDelete: "cascade" }),
    sessionId: text("session_id").references(() => sessions.id, { onDelete: "set null" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    referenceId: text("reference_id"),
    authorizationCodeId: text("authorization_code_id"),
    resources: text(),
    requestedUserInfoClaims: text("requested_user_info_claims"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at"),
    revoked: timestamp("revoked"),
    rotatedAt: timestamp("rotated_at"),
    rotationReplayResponse: text("rotation_replay_response"),
    rotationReplayExpiresAt: timestamp("rotation_replay_expires_at"),
    authTime: timestamp("auth_time"),
    confirmation: text(),
    scopes: text().notNull(),
  },
  (table) => [
    uniqueIndex("oauth_refresh_token_token_unique").on(table.token),
    index("oauth_refresh_token_client_id_idx").on(table.clientId),
    index("oauth_refresh_token_session_id_idx").on(table.sessionId),
    index("oauth_refresh_token_user_id_idx").on(table.userId),
    index("oauth_refresh_token_authorization_code_id_idx").on(table.authorizationCodeId),
  ],
);

export const oauthAccessTokens = sqliteTable(
  "oauth_access_token",
  {
    id: text().primaryKey(),
    token: text(),
    clientId: text("client_id")
      .notNull()
      .references(() => oauthClients.clientId, { onDelete: "cascade" }),
    sessionId: text("session_id").references(() => sessions.id, { onDelete: "set null" }),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    referenceId: text("reference_id"),
    authorizationCodeId: text("authorization_code_id"),
    resources: text(),
    requestedUserInfoClaims: text("requested_user_info_claims"),
    refreshId: text("refresh_id").references(() => oauthRefreshTokens.id, {
      onDelete: "cascade",
    }),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at"),
    revoked: timestamp("revoked"),
    confirmation: text(),
    scopes: text().notNull(),
  },
  (table) => [
    uniqueIndex("oauth_access_token_token_unique").on(table.token),
    index("oauth_access_token_client_id_idx").on(table.clientId),
    index("oauth_access_token_session_id_idx").on(table.sessionId),
    index("oauth_access_token_user_id_idx").on(table.userId),
    index("oauth_access_token_authorization_code_id_idx").on(table.authorizationCodeId),
    index("oauth_access_token_refresh_id_idx").on(table.refreshId),
  ],
);

// What each member agreed to share with each app.
export const oauthConsents = sqliteTable(
  "oauth_consent",
  {
    id: text().primaryKey(),
    clientId: text("client_id")
      .notNull()
      .references(() => oauthClients.clientId, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    referenceId: text("reference_id"),
    resources: text(),
    requestedUserInfoClaims: text("requested_user_info_claims"),
    scopes: text().notNull(),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    index("oauth_consent_client_id_idx").on(table.clientId),
    index("oauth_consent_user_id_idx").on(table.userId),
  ],
);

// Client assertion IDs already used, so none can be replayed.
export const oauthClientAssertions = sqliteTable("oauth_client_assertion", {
  id: text().primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const households = sqliteTable("household", {
  id: text().primaryKey(),
  name: text().notNull(),
  // See householdLanguages and householdUnits in @shared/household.
  language: text().$type<HouseholdLanguage>().default("en").notNull(),
  units: text().$type<HouseholdUnits>().default("metric").notNull(),
  // An IANA name like "Europe/Stockholm", for the household's own "today" where no browser says.
  timeZone: text("time_zone").default("UTC").notNull(),
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
    // When the member finished or hid the "Get started" checklist.
    checklistHiddenAt: timestamp("checklist_hidden_at"),
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

// A household's recipes. Deleting one takes its tags, favorites, and planned meals too.
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
    plannedBy: text("planned_by").notNull(),
    plannedAt: timestamp("planned_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.householdId, table.date] }),
    index("planned_meal_recipe_id_idx").on(table.recipeId),
  ],
);
