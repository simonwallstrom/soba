# Recipe imports

Soba uses a language model in one place: importing recipes. Help with planning meals comes from Claude, through the [MCP server](./mcp.md).

When someone pastes a link or uploads photos, a Workflow (`RecipeImportWorkflow`) sends the page or images to Claude Sonnet through Cloudflare AI Gateway. Sonnet pulls out a structured recipe (title, ingredients, steps) and translates it into the household's language and units. The Workflow saves the finished recipe for the household itself, so an import completes whether or not the app is open. The recipe list shows each import while it runs, and the member's app announces the new recipe with a toast, right away or the next time it opens.

Code: [`src/server/recipe-import/`](../src/server/recipe-import/). `bun run import:compare` compares models on the same sources.
