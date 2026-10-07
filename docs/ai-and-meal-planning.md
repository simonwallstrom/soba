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

When a recipe is created, imported, or edited, the Worker asks Clef, Cloudflare's decision model, five fixed questions about it:

- **Dinner:** is it a family main course, rather than dessert, baking, breakfast, or a side?
- **Base:** potato, rice, pasta, bread, or other
- **Protein:** fish, chicken, beef, pork, vegetarian, or other
- **Effort:** quick, normal, or involved
- **Treat:** is it fun food saved for a treat, like tacos, pizza, or burgers?

The answers are validated and returned to the browser, which saves them as a hidden **profile** (a `v1.RecipeProfiled` event). Users never see profiles, so tags stay the household's own. Until Clef has answered, or if a request fails, a regex guess from the title and tags stands in, so new recipes can be suggested right away.

Code: [`src/server/recipe-profile/clef.ts`](../src/server/recipe-profile/clef.ts) (questions), [`meal-planner/-recipe-profile.ts`](../src/client/routes/_authenticated/_app/meal-planner/-recipe-profile.ts) (fallback guess).

## 3. Suggesting meals

**Suggest meals** fills the week's open days. For each day, `suggestWeek` scores every dinner recipe and picks the highest:

- **Habits:** recipes the household often eats on a weekday score higher on that weekday (taco Friday). Only past days count, so the planner never learns from its own suggestions.
- **Recency:** a recipe from last week is penalized, less so from two or three weeks back, and one not eaten for a while gets a small boost.
- **Variety:** a second dish on the same base or protein that week is penalized, a third almost never wins. One fish dinner on a weeknight gets a boost.
- **Effort:** quick dishes are favored on weeknights and involved ones on weekends.
- **Treats:** a treat scores well only on weekdays when the household usually has one.
- **Feedback:** shuffling a suggestion counts slightly against that recipe on that weekday next time, and removing it counts more.

**Shuffle** swaps a day for one of up to five similar alternatives: the same base, and a treat stays a treat.

Code: [`meal-planner/-suggest.ts`](../src/client/routes/_authenticated/_app/meal-planner/-suggest.ts), with tests beside it.

## Why it works this way

- **Cheap and fast:** models run once per recipe, not once per suggestion.
- **Instant and private:** suggestions run on the device from the synced plan, with no request per click.
- **Explainable:** every score comes from a few readable weights, so a surprising suggestion can be traced and tuned.
