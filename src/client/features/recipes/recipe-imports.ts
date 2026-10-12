import { shrinkPhoto } from "@client/features/recipes/recipe-photo";
import { api } from "@client/lib/api";
import { queryClient } from "@client/lib/query";
import { queryOptions } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";

// An import a Workflow is working on for this member, or one that failed.
export type RecipeImport = InferResponseType<
  (typeof api)["recipe-import"]["$get"],
  200
>["imports"][number];

export const maxImportPhotos = 3;

export function isImportRunning(item: Pick<RecipeImport, "status">) {
  return item.status === "reading" || item.status === "writing";
}

export const recipeImportsOptions = queryOptions({
  queryKey: ["recipe-imports"],
  queryFn: async ({ signal }) => {
    const response = await api["recipe-import"].$get({}, { init: { signal, cache: "no-store" } });
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    return (await response.json()).imports;
  },
  // Watches closely while an import runs; otherwise checks when the app regains focus.
  refetchInterval: (query) => (query.state.data?.some(isImportRunning) ? 2000 : false),
  refetchOnWindowFocus: "always",
});

function refreshImports() {
  return queryClient.invalidateQueries({ queryKey: recipeImportsOptions.queryKey });
}

async function send(request: () => Promise<Response>, fallback: string) {
  let response: Response;
  try {
    response = await request();
  } catch {
    throw new Error("Could not reach Soba. Check your connection and try again.");
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
        ? body.error
        : fallback;
    throw new Error(message);
  }
  return body;
}

// Starts importing a recipe page. Resolves once the import shows in the list.
export async function startUrlImport(url: string) {
  await send(
    () => api["recipe-import"].url.$post({ json: { url } }),
    "Could not start the import. Please try again.",
  );
  await refreshImports();
}

// Starts importing photos of one recipe, in page order. Resolves once the import shows in the list.
export async function startPhotoImport(files: File[]) {
  const form = new FormData();
  for (const file of files) form.append("photo", await shrinkPhoto(file));
  await send(
    () => fetch("/api/recipe-import/photos", { method: "POST", body: form }),
    "Could not start the import. Please try again.",
  );
  await refreshImports();
}

export async function retryImport(id: string) {
  await send(
    () => api["recipe-import"][":id"].retry.$post({ param: { id } }),
    "Could not retry the import. Please try again.",
  );
  await refreshImports();
}

// Cancels a running import or dismisses a failed one. It leaves the list right away.
export async function dismissImport(id: string) {
  queryClient.setQueryData(recipeImportsOptions.queryKey, (imports) =>
    imports?.filter((item) => item.id !== id),
  );
  try {
    await send(
      () => api["recipe-import"][":id"].$delete({ param: { id } }),
      "Could not remove the import.",
    );
  } finally {
    await refreshImports();
  }
}

// Saves a finished import as a recipe, under the import's ID. Resolves to its title, or null
// when another of the member's browsers got there first.
export async function claimImport(id: string) {
  const response = await api["recipe-import"][":id"].claim.$post({ param: { id } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Could not save the imported recipe");
  return response.json();
}

// The site a link import comes from, such as "ica.se".
export function importHost(url: string | null) {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./u, "");
  } catch {
    return null;
  }
}
