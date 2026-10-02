import { useHouseholdQuery, useHouseholdStore } from "@client/features/household/store";
import { favorites$ } from "@client/features/recipes/queries";
import { recipeFavorited, recipeUnfavorited } from "@shared/recipes";

// The signed-in member's favorite recipe IDs, newest first, and a toggle for one recipe.
export function useFavorites(householdId: string, userId: string) {
  const store = useHouseholdStore(householdId);
  const rows = useHouseholdQuery(householdId, favorites$(userId));
  const recipeIds = rows.map(({ recipeId }) => recipeId);
  const favoriteIds = new Set(recipeIds);

  function toggleFavorite(recipeId: string) {
    const at = new Date();
    store.commit(
      favoriteIds.has(recipeId)
        ? recipeUnfavorited({ recipeId, userId, unfavoritedAt: at })
        : recipeFavorited({ recipeId, userId, favoritedAt: at }),
    );
  }

  return { favoriteIds, recipeIds, toggleFavorite };
}
