# AI and meal planning

Soba uses language models in two places and plain, hand-tuned scoring code in a third. The models turn messy input into structured data, and the planner reasons over that data with simple statistics drawn from the household's own history. Nothing is trained.

| Step             | What runs                          | Where                            |
| ---------------- | ---------------------------------- | -------------------------------- |
| Import a recipe  | Claude Sonnet, via AI Gateway      | Worker, in a background Workflow |
| Profile a recipe | Clef on Workers AI, via AI Gateway | Worker, when a recipe is saved   |
| Suggest meals    | Scoring code                       | Client, on the device            |

## 1. Importing recipes

When someone pastes a link or uploads photos, a Workflow (`RecipeImportWorkflow`) sends the page or images to Claude Sonnet through Cloudflare AI Gateway. Sonnet pulls out a structured recipe (title, ingredients, steps) and translates it into the household's language and units. The recipe list shows each import while it runs.

Code: [`src/server/recipe-import/`](../src/server/recipe-import/). `bun run import:compare` compares models on the same sources.

## 2. Profiling recipes

The Worker asks Clef, Cloudflare's decision model, five fixed questions about each recipe:

- **Dinner:** could a family eat it as their whole dinner? Soups and pancakes count; desserts, baking, and sides don't.
- **Base:** potato, rice, pasta, bread, or other
- **Protein:** fish, chicken, beef, pork, vegetarian, or other
- **Effort:** quick, normal, or involved
- **Treat:** is it festive "Friday food", like tacos, pizza, or burgers, rather than everyday cooking?

Each yes/no question has its own threshold in `clef.ts`, set from the comparison script below: a doubtful dinner is kept, but only a clear treat counts.

The answers are validated and returned to the browser, which saves them as a hidden **profile** (a `v1.RecipeProfiled` event). Users never see profiles, so tags stay the household's own.

### Keeping profiles current

`RecipeProfiler`, mounted in the app layout, reads any recipe whose profile is missing or out of date, one at a time in the background. Each profile stores:

- **`version`:** the version of the questions it answered. Bump `recipeProfileVersion` in `@shared/recipe-profile` when the questions change, and every recipe is read again.
- **`sourceHash`:** a hash of the title, description, ingredients, and steps it was read from. Editing those triggers a new read; changing only a photo, tags, or servings doesn't.

This covers new and edited recipes, imports, reads that failed, and tabs closed before a read finished. To avoid reading the same recipe twice:

- One tab per browser runs reads, using a Web Lock.
- The member who saved a recipe reads it right away. Other members wait 2 minutes, in case that member's read is still on its way.
- Except for recipes saved in this session, reads wait 10 seconds after the app opens, so profiles from other devices can sync in first.
- A failed read isn't retried until the recipe changes or the app opens again. Hitting the rate limit pauses reads for a minute.

`bun run profile:compare` reads the 20 hand-labeled sample recipes with Clef and reports agreement per question, with how close each disagreement was. Run it after changing the questions.

Until a recipe has a profile, a regex guess from its title and tags stands in, so new recipes can be suggested right away.

Code: [`src/shared/recipe-profile.ts`](../src/shared/recipe-profile.ts) (schema and versioning), [`src/server/recipe-profile/clef.ts`](../src/server/recipe-profile/clef.ts) (questions), [`features/recipes/recipe-profiler.tsx`](../src/client/features/recipes/recipe-profiler.tsx) (background reads), [`features/recipes/recipe-profile.ts`](../src/client/features/recipes/recipe-profile.ts) (reading and the fallback guess).

## 3. Suggesting meals

**Suggest meals** fills the week's open days. It scores every dinner recipe for every open day and fills the day with the strongest pick first, so taco Friday is planned before a Wednesday that would happily take the tacos. Scores come from:

- **Habits:** recipes the household often eats on a weekday score higher on that weekday (taco Friday). A habit has to start with dinners the household picked themselves, at least twice on that weekday. Accepted suggestions keep it going but can't start one, or the planner would learn from itself and repeat the same week forever.
- **Favorites:** each member who favorited a recipe adds to its score, up to two members. A favorite beats the small nudges below, but not having had it in the last week or two.
- **Recency:** a recipe from the last 7 days is almost never suggested again, one from 1–3 weeks back less so the longer ago it was, and one not eaten for a while gets a small boost.
- **Variety:** a second dish on the same base or protein that week is penalized, a third almost never wins. One fish dinner on a weeknight gets a boost.
- **Effort:** involved dishes are kept off Monday to Thursday, unless they're that day's habit: better a quick dish from last week. Quick dishes get a small boost on weeknights, and involved ones on weekends.
- **Treats:** one a week at most, on the days the household has them. Until it shows its treat days, weekends are for treats.
- **Shuffles:** shuffling past a suggestion counts against that recipe next time, most on the same weekday. Removing a meal doesn't count: it usually means the day is taken, not that the recipe is unwanted.

Habits and shuffles fade, with half-lives of 12 and 8 weeks, so the planner follows a household that changes its ways. A little randomness breaks near-ties, so a new household doesn't get the first recipes in its list every week, and suggesting again can give a different week.

**Shuffle** swaps a day for one of up to five similar alternatives: the same base, and a treat stays a treat.

Code: [`meal-planner/-suggest.ts`](../src/client/routes/_authenticated/_app/meal-planner/-suggest.ts), with tests beside it. `bun run suggest:simulate` plays a household that accepts every suggested week, starting from the sample recipes, and prints the weeks and a summary: recipes used, weeknight effort, treat days, and repeats. Run it after changing the weights, with a few `--seed` values and `--favorites`.

## Why it works this way

- **Cheap and fast:** models run once per recipe version, not once per suggestion.
- **Instant and private:** suggestions run on the device from the synced plan, with no request per click.
- **Explainable:** every score comes from a few readable weights, so a surprising suggestion can be traced and tuned.
