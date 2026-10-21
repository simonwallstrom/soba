import { Button, buttonVariants } from "@client/components/ui/button";
import { BookmarkAdd02Icon, CheckIcon } from "@client/components/ui/icons";
import { toast } from "@client/components/ui/toast";
import { saveSharedRecipe } from "@client/features/recipes/recipe-data";
import { signInErrorMessage, signInGoogle } from "@client/lib/auth";
import { sessionOptions } from "@client/lib/session";
import type { Recipe } from "@shared/recipes";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

const route = getRouteApi("/r/$token");

type SharedRecipe = Pick<
  Recipe,
  "title" | "description" | "servings" | "imageUrl" | "sourceUrl" | "ingredients" | "instructions"
>;

// Saves a copy of the recipe to the visitor's own household. Logged out, it logs in first, and the
// route saves it on the way back; once saved, it opens the copy.
export function SaveSharedRecipe({
  justSavedId,
  recipe,
  savedRecipeId: savedOnServer,
  token,
}: {
  // Saved by the route just now, on the way back from logging in.
  justSavedId: string | null;
  recipe: SharedRecipe;
  savedRecipeId: string | null;
  token: string;
}) {
  const { error: callbackError, save: savedOnArrival } = route.useSearch();
  const navigate = useNavigate();
  const { data: session } = useSuspenseQuery(sessionOptions);
  // Saved here, which shows before the server answers. Null takes back a save that failed.
  const [savedHere, setSavedHere] = useState<string | null>();
  const savedRecipeId = savedHere === undefined ? savedOnServer : savedHere;
  const [loggingIn, setLoggingIn] = useState(false);
  const announced = useRef(false);

  function announceSaved(recipeId: string) {
    const toastId = toast.add({
      title: "Saved to your recipes",
      actionProps: {
        children: "Open",
        onClick: () => {
          toast.close(toastId);
          void navigate({ to: "/recipes/$recipeId", params: { recipeId } });
        },
      },
    });
  }

  async function save() {
    if (!session.user) return;
    const id = crypto.randomUUID();
    setSavedHere(id);
    const savedId = await saveSharedRecipe(token, recipe, { id, userId: session.user.id });
    setSavedHere(savedId);
    if (savedId) announceSaved(savedId);
  }

  async function logIn() {
    setLoggingIn(true);
    const path = `/r/${token}`;
    try {
      await signInGoogle({ callbackURL: `${path}?save=true`, errorCallbackURL: path });
    } catch (error) {
      toast.add({ title: error instanceof Error ? error.message : "Could not log in" });
      setLoggingIn(false);
    }
  }

  // Back from logging in: say whether it worked, and tidy the URL so a reload doesn't repeat it.
  useEffect(() => {
    if (!savedOnArrival && !callbackError) return;
    if (!announced.current) {
      announced.current = true;
      if (justSavedId) announceSaved(justSavedId);
      if (callbackError) {
        toast.add({ title: "Couldn’t log in", description: signInErrorMessage(callbackError) });
      }
    }
    void navigate({ to: ".", search: {}, replace: true });
  });

  if (!session.user) {
    return (
      <Button disabled={loggingIn} onClick={() => void logIn()} variant="primary">
        {loggingIn ? "Logging in…" : "Log in to save"}
      </Button>
    );
  }
  // A new account sets up its household before it has anywhere to save to.
  if (!session.household) {
    return (
      <Link className={buttonVariants({ variant: "primary" })} to="/onboarding">
        Set up Soba to save
      </Link>
    );
  }
  if (savedRecipeId) {
    return (
      <Link
        aria-label="Saved. Open it in your recipes"
        className={buttonVariants()}
        params={{ recipeId: savedRecipeId }}
        to="/recipes/$recipeId"
      >
        <CheckIcon />
        Saved
        <span aria-hidden="true" className="text-olive-500">
          · Open
        </span>
      </Link>
    );
  }
  return (
    <Button onClick={() => void save()} variant="primary">
      <BookmarkAdd02Icon />
      Save<span className="max-sm:hidden"> to my recipes</span>
    </Button>
  );
}
