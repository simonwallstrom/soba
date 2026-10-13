# AI and meal planning

Soba uses language models in two places and plain, hand-tuned scoring code in a third. The models turn messy input into structured data, and the planner reasons over that data with simple statistics drawn from the household's own history. Nothing is trained.

| Step             | What runs                          | Where                            |
| ---------------- | ---------------------------------- | -------------------------------- |
| Import a recipe  | Claude Sonnet, via AI Gateway      | Worker, in a background Workflow |
| Profile a recipe | Clef on Workers AI, via AI Gateway | Worker, when a recipe is saved   |
| Suggest meals    | Scoring code                       | Client, on the device            |

## 1. Importing recipes

When someone pastes a link or uploads photos, a Workflow (`RecipeImportWorkflow`) sends the page or images to Claude Sonnet through Cloudflare AI Gateway. Sonnet pulls out a structured recipe (title, ingredients, steps) and translates it into the household's language and units. The Workflow saves the finished recipe for the household itself, so an import completes whether or not the app is open. The recipe list shows each import while it runs, and the member's app announces the new recipe with a toast, right away or the next time it opens.

Code: [`src/server/recipe-import/`](../src/server/recipe-import/). `bun run import:compare` compares models on the same sources.

## 2. Profiling recipes

The Worker asks Clef, Cloudflare's decision model, five fixed questions about each recipe:

- **Dinner:** could a family eat it as their whole dinner? Soups and pancakes count; desserts, baking, and sides don't.
- **Base:** potato, rice, pasta, bread, or other
- **Protein:** fish, chicken, beef, pork, vegetarian, or other
- **Effort:** quick, normal, or involved
- **Treat:** is it festive "Friday food", like tacos, pizza, or burgers, rather than everyday cooking?

Each yes/no question has its own threshold in `clef.ts`, set from the comparison script below: a doubtful dinner is kept, but only a clear treat counts.

The answers are validated and saved with the recipe as a hidden **profile**. Users never see profiles, so tags stay the household's own.

### Keeping profiles current

The server reads recipes on its own, so a recipe gets a profile however it was saved:

- **On save:** creating or editing a recipe starts a read once the response is on its way (`waitUntil`), so saving never waits for the model. An import's Workflow reads its recipe as a last step.
- **Catch-up:** a scheduled run every 5 minutes (the trigger in `cloudflare.config.ts`) reads up to 10 recipes that were never read or changed since their last read. Recipes whose read failed, or whose profile answered older questions, are tried again at most once an hour each.

Each profile stores:

- **`version`:** the version of the questions it answered. Bump `recipeProfileVersion` in `@shared/recipe-profile` when the questions change, and the catch-up reads every recipe again.
- **`sourceHash`:** a hash of the title, description, ingredients, and steps it was read from. Editing those triggers a new read; changing only a photo, tags, or servings doesn't.

The recipe row keeps `profileCheckedAt`, when its last read began, which is how the catch-up tells what is due. The app gets a new profile with its next fetch of the recipes.

Scheduled runs don't fire on their own in local dev, so there only saving a recipe reads it.

`bun run profile:compare` reads the 47 hand-labeled sample recipes with Clef and reports agreement per question, with how close each disagreement was. Run it after changing the questions.

Until a recipe has a profile, a regex guess from its title and tags stands in, so new recipes can be suggested right away.

Code: [`src/shared/recipe-profile.ts`](../src/shared/recipe-profile.ts) (types and versioning), [`src/server/recipe-profile/clef.ts`](../src/server/recipe-profile/clef.ts) (questions), [`src/server/recipe-profile/profiles.ts`](../src/server/recipe-profile/profiles.ts) (reading on save and the catch-up), [`features/recipes/recipe-profile.ts`](../src/client/features/recipes/recipe-profile.ts) (the fallback guess).

## 3. Suggesting meals

**Suggest meals** fills the week's open days. It scores every dinner recipe for every open day and fills the day with the strongest pick first, so taco Friday is planned before a Wednesday that would happily take the tacos. Scores come from:

- **Habits:** recipes the household often eats on a weekday score higher on that weekday (taco Friday). A habit has to start with dinners the household picked themselves, at least twice on that weekday. Accepted suggestions keep it going but can't start one, or the planner would learn from itself and repeat the same week forever.
- **Recency:** a recipe from the last 7 days is almost never suggested again, one from 1–3 weeks back less so the longer ago it was. After that, a recipe climbs the longer it goes unplanned, so the whole collection comes round; one never planned, like one just added, counts as long ago.
- **Variety:** a second dish on the same base or protein that week is penalized, a third almost never wins. One fish dinner on a weeknight gets a boost.
- **Effort:** involved dishes are kept off Monday to Thursday, unless they're that day's habit: better a quick dish from last week. Quick dishes get a small boost on weeknights, and involved ones on weekends.
- **Treats:** one a week at most, on the days the household has them. Until it shows its treat days, weekends are for treats.

Habits fade, with a half-life of 12 weeks, so the planner follows a household that changes its ways.

Nothing else teaches it, on purpose. People shuffle for ideas and often keep the first pick, so a shuffle isn't a rejection. Removing a meal usually means the day is taken. And favorites are pins for quick access in the sidebar, not a taste: pinning what you're cooking this week shouldn't bring it back next week. A household that never wants a recipe suggested deletes it.

A little randomness breaks near-ties, so a new household doesn't get the first recipes in its list every week, and suggesting again can give a different week.

**Shuffle** steps a suggested meal through every dinner like it, best fit first and round to where it started: another pasta for a pasta, another treat for a treat whatever its base, and for the catch-all "other" base, the same protein. Recipes planned within a week of the day are skipped. The options are worked out on each click, so recipes added since show up.

Code: [`meal-planner/-suggest.ts`](../src/client/routes/_authenticated/_app/meal-planner/-suggest.ts), with tests beside it. `bun run suggest:simulate` plays a household that accepts every suggested week, starting from the sample recipes, and prints the weeks and a summary: recipes used, weeknight effort, treat days, and repeats. Run it after changing the weights, with a few `--seed` values.

## Why it works this way

- **Cheap and fast:** models run once per recipe version, not once per suggestion.
- **Instant and private:** suggestions run on the device from the loaded plan, with no request per click.
- **Explainable:** every score comes from a few readable weights, so a surprising suggestion can be traced and tuned.
