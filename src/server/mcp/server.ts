import { McpServer } from "@modelcontextprotocol/server";
import { toStandardJsonSchema } from "@valibot/to-json-schema";
import * as v from "valibot";

import type { Membership } from "../household/household";
import { addDays, getHousehold, getMealPlan, getRecipe, searchRecipes } from "./read-tools";

export type McpContext = {
  membership: Membership;
  userId: string;
  /** The app's origin, for links to recipes. */
  appUrl: string;
  /** Today's date, "2026-10-12", which meal plan ranges default around. */
  today: string;
};

const dateSchema = v.pipe(
  v.string(),
  // The same days as mealDatePattern, in a form JSON Schema can describe.
  v.isoDate(),
  v.description("A date like 2026-10-12"),
);

function json(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value) }] };
}

function fail(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

// One server per request, for the member the access token belongs to. See docs/mcp.md.
export function createServer({ membership, userId, appUrl, today }: McpContext) {
  const language = new Intl.DisplayNames("en", { type: "language" }).of(membership.language);
  const units = membership.units === "us" ? "US customary units" : "metric units";
  const server = new McpServer(
    { name: "soba", title: "Soba", version: "1.0.0" },
    {
      instructions: `Soba is a family recipe organizer. You're connected to the household "${membership.name}", whose recipes are written in ${language} with ${units}. Find recipes with search_recipes, read one with get_recipe, and see planned and past dinners with get_meal_plan. Link to recipes with their url.`,
    },
  );
  const readOnly = { readOnlyHint: true, openWorldHint: false };

  server.registerTool(
    "get_household",
    {
      title: "Get household",
      description:
        "The household's name, members, language and units for writing recipes, how many recipes it has, and every tag it uses.",
      annotations: readOnly,
    },
    async () => json(await getHousehold(membership, userId)),
  );

  server.registerTool(
    "search_recipes",
    {
      title: "Search recipes",
      description: `Finds the household's recipes by words in their title, description, ingredients, or tags, and optionally by one tag. Leave the query out to list every recipe. Each result has its ID for get_recipe, its tags, the last day it was eaten, and the next day it's planned, if any. Today is ${today}.`,
      inputSchema: toStandardJsonSchema(
        v.object({
          query: v.optional(
            v.pipe(
              v.string(),
              v.maxLength(200),
              v.description("Words that must all appear, like 'chicken curry'"),
            ),
          ),
          tag: v.optional(v.pipe(v.string(), v.maxLength(100), v.description("A tag's name"))),
          limit: v.optional(
            v.pipe(
              v.number(),
              v.integer(),
              v.minValue(1),
              v.maxValue(500),
              v.description("At most this many; 100 if left out"),
            ),
            100,
          ),
        }),
      ),
      annotations: readOnly,
    },
    async (input) => json(await searchRecipes(membership, userId, { appUrl, today }, input)),
  );

  server.registerTool(
    "get_recipe",
    {
      title: "Get recipe",
      description:
        "A recipe in full: description, servings, ingredients and instructions in sections, tags, the page it was imported from, and who added it.",
      inputSchema: toStandardJsonSchema(
        v.object({ id: v.pipe(v.string(), v.uuid(), v.description("The recipe's ID")) }),
      ),
      annotations: readOnly,
    },
    async ({ id }) => {
      const recipe = await getRecipe(membership, userId, appUrl, id);
      return recipe ? json(recipe) : fail("No recipe with that ID in this household.");
    },
  );

  server.registerTool(
    "get_meal_plan",
    {
      title: "Get meal plan",
      description: `The household plans one dinner a day. Lists the planned dinners between two dates, past ones included, so you can see what the household has eaten. Each day has its weekday, the recipe with its tags, and who planned it. Without dates, covers the last 8 weeks and the next 2. Today is ${today}.`,
      inputSchema: toStandardJsonSchema(
        v.object({
          from: v.optional(dateSchema),
          to: v.optional(dateSchema),
        }),
      ),
      annotations: readOnly,
    },
    async ({ from = addDays(today, -56), to = addDays(today, 13) }) => {
      if (from > to) return fail("`from` must be on or before `to`.");
      return json(await getMealPlan(membership, userId, { from, to }));
    },
  );

  return server;
}
