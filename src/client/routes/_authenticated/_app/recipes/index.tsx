import { householdStoreOptions } from "@client/features/household/store";
import { recipes$ } from "@client/features/recipes/queries";
import { formatMetaTitle } from "@client/lib/meta";
import { useStore } from "@livestore/react";
import { recipeCreated } from "@shared/recipes";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { SubmitEvent } from "react";

export const Route = createFileRoute("/_authenticated/_app/recipes/")({ component: Recipes });

function Recipes() {
  const { household } = Route.useRouteContext();
  const store = useStore(householdStoreOptions(household.id));
  // LiveStore's store-bound hook is stable for this store instance.
  // oxlint-disable-next-line react/hooks
  const items = store.useQuery(recipes$);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextTitle = title.trim();
    if (!nextTitle) return;
    store.commit(
      recipeCreated({
        id: crypto.randomUUID(),
        title: nextTitle,
        description: description.trim(),
        createdAt: new Date(),
      }),
    );
    setTitle("");
    setDescription("");
  }

  return (
    <>
      <title>{formatMetaTitle("Recipes")}</title>
      <section className="space-y-4">
        <p>Your household’s recipes, saved and synced together.</p>
        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            Title
            <input
              className="block w-full border p-2"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              required
            />
          </label>
          <label className="block">
            Description
            <textarea
              className="block w-full border p-2"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={2000}
            />
          </label>
          <button type="submit" className="border px-3 py-2">
            Add recipe
          </button>
        </form>
        {items.length === 0 && (
          <p>No recipes yet. Recipes added by anyone in your household show up here.</p>
        )}
        <ul className="space-y-3">
          {items.map((recipe) => (
            <li key={recipe.id} className="border p-3">
              <h2 className="font-medium">{recipe.title}</h2>
              {recipe.description && <p>{recipe.description}</p>}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
