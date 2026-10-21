import { count, countDistinct, desc, eq, max } from "drizzle-orm";

import { getDatabase } from "../db/client";
import {
  householdMembers,
  households,
  oauthConsents,
  plannedMeals,
  recipes,
  sessions,
  users,
} from "../db/schema";

type Progress = {
  ownsHousehold: boolean;
  addedRecipe: boolean;
  invited: boolean;
  planned: boolean;
  connected: boolean;
};

// The "Get started" checklist's steps, as features/get-started/checklist.tsx ticks them off: the
// owner also has "Create your household" and "Invite your family".
function checklistProgress({ ownsHousehold, addedRecipe, invited, planned, connected }: Progress) {
  const steps = ownsHousehold
    ? [true, addedRecipe, invited, planned, connected]
    : [addedRecipe, planned, connected];
  return { done: steps.filter(Boolean).length, total: steps.length };
}

/** Everyone who has signed up, with their household and how far they've got. Newest first. */
export async function listUsers() {
  const db = getDatabase();
  const [
    accounts,
    memberCounts,
    householdRecipes,
    recipesByUser,
    householdMeals,
    mealsByUser,
    assistants,
    lastActive,
  ] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        createdAt: users.createdAt,
        householdId: households.id,
        householdName: households.name,
        role: householdMembers.role,
      })
      .from(users)
      .leftJoin(householdMembers, eq(householdMembers.userId, users.id))
      .leftJoin(households, eq(households.id, householdMembers.householdId))
      .orderBy(desc(users.createdAt)),
    db
      .select({ householdId: householdMembers.householdId, count: count() })
      .from(householdMembers)
      .groupBy(householdMembers.householdId),
    db
      .select({ householdId: recipes.householdId, count: count() })
      .from(recipes)
      .groupBy(recipes.householdId),
    db
      .select({ userId: recipes.createdBy, count: count() })
      .from(recipes)
      .groupBy(recipes.createdBy),
    db
      .select({
        householdId: plannedMeals.householdId,
        count: count(),
        lastDate: max(plannedMeals.date),
      })
      .from(plannedMeals)
      .groupBy(plannedMeals.householdId),
    db
      .select({ userId: plannedMeals.plannedBy, count: count() })
      .from(plannedMeals)
      .groupBy(plannedMeals.plannedBy),
    db
      .select({ userId: oauthConsents.userId, count: countDistinct(oauthConsents.clientId) })
      .from(oauthConsents)
      .groupBy(oauthConsents.userId),
    // A session's updatedAt moves when it refreshes, at most once a day.
    db
      .select({ userId: sessions.userId, at: max(sessions.updatedAt) })
      .from(sessions)
      .groupBy(sessions.userId),
  ]);

  const members = new Map(memberCounts.map((row) => [row.householdId, row.count]));
  const recipeCounts = new Map(householdRecipes.map((row) => [row.householdId, row.count]));
  const userRecipes = new Map(recipesByUser.map((row) => [row.userId, row.count]));
  const meals = new Map(householdMeals.map((row) => [row.householdId, row]));
  const userMeals = new Map(mealsByUser.map((row) => [row.userId, row.count]));
  const assistantCounts = new Map(assistants.map((row) => [row.userId, row.count]));
  const activeAt = new Map(lastActive.map((row) => [row.userId, row.at]));

  return accounts.map(({ householdId, householdName, role, createdAt, ...user }) => {
    const connected = assistantCounts.get(user.id) ?? 0;
    const lastActiveAt = activeAt.get(user.id);
    const meal = householdId ? meals.get(householdId) : undefined;
    return {
      ...user,
      signedUpAt: createdAt.toISOString(),
      lastActiveAt: lastActiveAt ? new Date(lastActiveAt).toISOString() : null,
      assistants: connected,
      household:
        householdId && householdName && role
          ? {
              id: householdId,
              name: householdName,
              role,
              members: members.get(householdId) ?? 1,
              recipes: recipeCounts.get(householdId) ?? 0,
              plannedMeals: meal?.count ?? 0,
              lastMealDate: meal?.lastDate ?? null,
              checklist: checklistProgress({
                ownsHousehold: role === "owner",
                addedRecipe: (userRecipes.get(user.id) ?? 0) > 0,
                invited: (members.get(householdId) ?? 1) > 1,
                planned: (userMeals.get(user.id) ?? 0) > 0,
                connected: connected > 0,
              }),
            }
          : null,
    };
  });
}
