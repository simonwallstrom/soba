import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";

import { detectPhotoType, maxPhotoBytes, photoKey, savePhoto } from "../photos/photo";
import { ExtractionError, extractRecipe, ModelBusyError } from "./extract";
import type { ImportSettings, Photo, Source } from "./extract";
import { getImport, updateImport } from "./imports";
import { fetchRecipePage, PageError, readLimited } from "./page";
import type { RecipePage } from "./page";

export type RecipeImportParams = { importId: string; settings: ImportSettings };

// What a step hands on: its result, or a message for the member when retrying cannot help.
type Outcome<T> = { ok: true; value: T } | { ok: false; error: string };

const failedMessage = "Could not import the recipe. Please try again.";

// Turns a page or photos into a recipe in the background, so an import survives the member
// closing the app. The member's browser saves the result; see listImports and claimImport.
export class RecipeImportWorkflow extends WorkflowEntrypoint<Env, RecipeImportParams> {
  override async run(event: Readonly<WorkflowEvent<RecipeImportParams>>, step: WorkflowStep) {
    const { importId, settings } = event.payload;
    try {
      const row = await step.do("load import", async () => {
        const found = await getImport(importId);
        // Dismissed before it started.
        if (!found) return null;
        return {
          kind: found.kind,
          householdId: found.householdId,
          userId: found.userId,
          sourceUrl: found.sourceUrl,
          sourcePhotoIds: found.sourcePhotoIds ?? [],
        };
      });
      if (!row) return;

      let page: RecipePage | null = null;
      if (row.kind === "page" && row.sourceUrl) {
        const sourceUrl = row.sourceUrl;
        const read = await step.do(
          "read page",
          {
            retries: { limit: 2, delay: "2 seconds", backoff: "exponential" },
            timeout: "1 minute",
          },
          () => expected(() => fetchRecipePage(new URL(sourceUrl)), PageError),
        );
        if (!read.ok) return await this.fail(step, importId, read.error);
        page = read.value;
        const { imageUrl, title, url } = page;
        // Shows the page's own title and image while the recipe is written.
        await step.do("show page", async () => {
          const photoId = imageUrl
            ? await this.saveSharedImage(row, imageUrl).catch(() => null)
            : null;
          await updateImport(importId, {
            status: "writing",
            sourceUrl: url,
            title: title ? shortenPageTitle(title) : null,
            photoId,
          });
        });
      } else {
        await step.do("start writing", () => updateImport(importId, { status: "writing" }));
      }

      const recipe = await step.do(
        "write recipe",
        { retries: { limit: 2, delay: "5 seconds", backoff: "exponential" }, timeout: "3 minutes" },
        async () => {
          // Photos are read inside the step, since step results must stay small.
          const source: Source = page
            ? { kind: "page", page }
            : { kind: "photos", photos: await this.readPhotos(row) };
          const gateway = { url: this.env.AI_GATEWAY_URL, token: this.env.AI_GATEWAY_TOKEN };
          return expected(() => extractRecipe(gateway, source, settings), ExtractionError);
        },
      );
      if (!recipe.ok) return await this.fail(step, importId, recipe.error);
      await step.do("store recipe", () =>
        updateImport(importId, { status: "ready", recipe: recipe.value, error: null }),
      );
    } catch (error) {
      // Retries ran out, or something unexpected broke.
      console.error("Recipe import failed", importId, error);
      await this.fail(
        step,
        importId,
        error instanceof ModelBusyError
          ? "Importing is busy right now. Try again in a minute."
          : failedMessage,
      );
    }
  }

  private async fail(step: WorkflowStep, importId: string, error: string) {
    await step.do("record failure", () => updateImport(importId, { status: "failed", error }));
  }

  private async readPhotos(row: { householdId: string; sourcePhotoIds: string[] }) {
    const photos: Photo[] = [];
    for (const photoId of row.sourcePhotoIds) {
      const object = await this.env.PHOTOS.get(photoKey(row.householdId, photoId));
      if (!object) continue;
      const bytes = new Uint8Array(await object.arrayBuffer());
      const type = detectPhotoType(bytes);
      if (type) photos.push({ bytes, type });
    }
    if (photos.length === 0) throw new Error("The photos are gone");
    return photos;
  }

  // Saves the image a recipe page shares itself with, as the imported recipe's photo.
  private async saveSharedImage(row: { householdId: string; userId: string }, imageUrl: string) {
    const response = await fetch(imageUrl, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) return null;
    // One byte over the limit tells a photo that is too large from one that just fits.
    const bytes = await readLimited(response, maxPhotoBytes + 1);
    if (bytes.byteLength > maxPhotoBytes) return null;
    const type = detectPhotoType(bytes);
    if (!type) return null;
    return savePhoto(
      this.env.PHOTOS,
      { householdId: row.householdId, uploadedBy: row.userId },
      bytes,
      type,
    );
  }
}

// Runs work whose expected failures carry a message for the member, so the step succeeds with
// that message instead of retrying. Anything else throws, and the step retries it.
async function expected<T>(
  work: () => Promise<T>,
  ExpectedError: new (...args: never[]) => Error,
): Promise<Outcome<T>> {
  try {
    return { ok: true, value: await work() };
  } catch (error) {
    if (error instanceof ExpectedError) return { ok: false, error: error.message };
    throw error;
  }
}

// "Best pancakes | Site name" reads as "Best pancakes" while the recipe is written.
export function shortenPageTitle(title: string) {
  return title.split(/\s+[|–—]\s+/u)[0]?.trim() || title.trim();
}
