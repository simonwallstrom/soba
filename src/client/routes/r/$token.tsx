import { WelcomeHeader, WelcomeLayout } from "@client/components/particles/welcome-layout";
import { buttonVariants } from "@client/components/ui/button";
import { SobaLogo } from "@client/components/ui/icons";
import { decimalSeparatorFor, RecipeContent } from "@client/features/recipes/recipe-content";
import { saveSharedRecipe } from "@client/features/recipes/recipe-data";
import { RecipeHeader } from "@client/features/recipes/recipe-header";
import { api } from "@client/lib/api";
import { formatMetaTitle } from "@client/lib/meta";
import { fetchFreshSession, getSession } from "@client/lib/session";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import * as v from "valibot";

import { SaveSharedRecipe } from "./-components/save-shared-recipe";

export const Route = createFileRoute("/r/$token")({
  // `save` comes back from "Log in to save", to finish what the visitor asked for.
  validateSearch: v.object({ error: v.optional(v.string()), save: v.optional(v.boolean()) }),
  loaderDeps: ({ search }) => ({ save: search.save === true }),
  loader: async ({ params, deps }) => {
    // Always asks the server, so a link that was turned off stops working at once.
    const [response, session] = await Promise.all([
      api.public.recipes[":token"].$get({ param: { token: params.token } }),
      // Just back from logging in, the stored session is still the logged-out one.
      deps.save ? fetchFreshSession() : getSession(),
    ]);
    if (response.status === 404) return { shared: null, savedId: null };
    // Rate limiting and server errors are not part of the typed response.
    if (!response.ok) throw new Error("Could not load this recipe");
    const shared = await response.json();
    // The household's own recipe opens in the app, where it can be edited.
    if (shared.viewer.ownRecipeId) {
      throw redirect({
        to: "/recipes/$recipeId",
        params: { recipeId: shared.viewer.ownRecipeId },
        replace: true,
      });
    }
    // Back from "Log in to save", into a household that hasn't saved it yet.
    if (deps.save && session.user && session.household && !shared.viewer.savedRecipeId) {
      const savedId = await saveSharedRecipe(params.token, shared.recipe, {
        id: crypto.randomUUID(),
        userId: session.user.id,
      });
      return {
        shared: { ...shared, viewer: { ...shared.viewer, savedRecipeId: savedId } },
        savedId,
      };
    }
    return { shared, savedId: null };
  },
  staleTime: 0,
  pendingComponent: SharedRecipeLoading,
  pendingMs: 200,
  pendingMinMs: 300,
  component: SharedRecipe,
});

const footerLinkStyles = "hover:text-olive-900 focus-visible:outline-2 dark:hover:text-olive-200";

function SharedRecipe() {
  const { token } = Route.useParams();
  const { shared, savedId } = Route.useLoaderData();

  if (!shared) {
    return (
      <>
        <title>{formatMetaTitle("Recipe not found")}</title>
        <WelcomeLayout>
          <WelcomeHeader
            description="It may have been turned off. Ask whoever shared it for a new link."
            title="This link doesn’t work anymore"
          />
          <Link className={buttonVariants()} to="/">
            Go to Soba
          </Link>
        </WelcomeLayout>
      </>
    );
  }

  const { recipe, household, viewer } = shared;
  return (
    <>
      <title>{formatMetaTitle(recipe.title)}</title>
      <SharedRecipeLayout
        action={
          <SaveSharedRecipe
            justSavedId={savedId}
            recipe={recipe}
            savedRecipeId={viewer.savedRecipeId}
            token={token}
          />
        }
      >
        <article className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-5 lg:gap-12 lg:p-12">
          <RecipeHeader
            byline={<p className="text-sm text-olive-500">Shared by {household.name}</p>}
            description={recipe.description}
            imageUrl={recipe.imageUrl}
            title={recipe.title}
          />
          {/* Checked ingredients and scaled servings stay in this browser, as in the app. */}
          <RecipeContent
            decimalSeparator={decimalSeparatorFor(household.language)}
            ingredients={recipe.ingredients}
            instructions={recipe.instructions}
            key={token}
            recipeId={`shared:${token}`}
            servings={recipe.servings}
          />
        </article>
      </SharedRecipeLayout>
    </>
  );
}

// The app's recipe page without the sidebar: a bar with the logo and one action, and the page
// below it, which scrolls by itself as app pages do.
function SharedRecipeLayout({
  action,
  children,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white dark:bg-olive-925">
      {/* Installed on iOS 26+, the top edge blurs unless an element with its own background
          touches it, as in the app header. */}
      <header className="flex h-[calc(3.5rem+env(safe-area-inset-top))] shrink-0 items-center justify-between gap-4 border-b-[0.5px] border-black/18 bg-white pt-[env(safe-area-inset-top)] pr-[max(1.25rem,env(safe-area-inset-right))] pl-[max(1.25rem,env(safe-area-inset-left))] lg:px-6 dark:border-white/10 dark:bg-olive-925">
        <Link
          aria-label="Soba"
          className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4"
          to="/"
        >
          <SobaLogo className="w-12 text-olive-900 dark:text-olive-100" />
        </Link>
        {action}
      </header>
      <main
        className="isolate flex min-h-0 flex-1 flex-col overflow-y-auto pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]"
        data-scroll-restoration-id="public-content"
      >
        <div className="flex-1">{children}</div>
        <footer className="mx-auto flex w-full max-w-5xl flex-col gap-x-6 gap-y-2 px-5 pt-6 pb-[calc(2rem+env(safe-area-inset-bottom))] text-sm text-olive-500 sm:flex-row sm:justify-between lg:px-12 lg:pb-12">
          <p>
            Made with{" "}
            <Link
              className="font-medium text-olive-700 hover:text-olive-900 dark:text-olive-300 dark:hover:text-olive-100"
              to="/"
            >
              Soba
            </Link>
            , the recipe organizer for families
          </p>
          <nav aria-label="Footer" className="flex gap-4 font-medium">
            <Link className={footerLinkStyles} to="/terms">
              Terms of use
            </Link>
            <Link className={footerLinkStyles} to="/privacy">
              Privacy policy
            </Link>
          </nav>
        </footer>
      </main>
    </div>
  );
}

// The page's outline, so nothing jumps when the recipe arrives.
function SharedRecipeLoading() {
  return (
    <>
      <title>{formatMetaTitle("Loading")}</title>
      <SharedRecipeLayout>
        <div aria-busy="true" className="mx-auto w-full max-w-5xl p-5 lg:p-12">
          {/* Laid out like the recipe's header (features/recipes/recipe-header.tsx). */}
          <div className="@container">
            <div className="grid gap-6 @2xl:grid-cols-2 @2xl:items-center @2xl:gap-10 @4xl:gap-16">
              <div className="-mx-5 -mt-5 aspect-5/4 bg-black/5 lg:m-0 lg:rounded-xl @2xl:col-start-2 @2xl:row-start-1 @2xl:m-0 @2xl:rounded-xl dark:bg-white/5" />
              <div className="flex flex-col gap-4 @2xl:col-start-1 @2xl:row-start-1">
                <div className="h-4 w-40 rounded-full bg-black/5 dark:bg-white/5" />
                <div className="h-8 w-3/4 rounded-full bg-black/5 dark:bg-white/5" />
                <div className="h-4 w-1/2 rounded-full bg-black/5 dark:bg-white/5" />
              </div>
            </div>
          </div>
          <output className="sr-only">Loading recipe…</output>
        </div>
      </SharedRecipeLayout>
    </>
  );
}
