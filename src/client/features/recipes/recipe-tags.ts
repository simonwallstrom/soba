import type { Tag } from "@shared/recipes";

const collator = new Intl.Collator("sv-SE");

export function compareNames(left: string, right: string) {
  return collator.compare(left, right);
}

// Each recipe's live tags, sorted by name. Links to deleted tags are dropped.
export function groupTagsByRecipe(
  tags: readonly Tag[],
  links: readonly { recipeId: string; tagId: string }[],
) {
  const tagsById = new Map(tags.map((tag) => [tag.id, tag]));
  const tagsByRecipe = new Map<string, Tag[]>();
  for (const { recipeId, tagId } of links) {
    const tag = tagsById.get(tagId);
    if (!tag) continue;
    const recipeTags = tagsByRecipe.get(recipeId);
    if (recipeTags) recipeTags.push(tag);
    else tagsByRecipe.set(recipeId, [tag]);
  }
  for (const recipeTags of tagsByRecipe.values()) {
    recipeTags.sort((left, right) => compareNames(left.name, right.name));
  }
  return tagsByRecipe;
}

// The tags on the most live recipes, most first and then by name. Unused tags are left out.
export function topTags(
  tags: readonly Tag[],
  links: readonly { recipeId: string; tagId: string }[],
  recipeIds: ReadonlySet<string>,
  limit: number,
) {
  const counts = new Map<string, number>();
  for (const { recipeId, tagId } of links) {
    if (recipeIds.has(recipeId)) counts.set(tagId, (counts.get(tagId) ?? 0) + 1);
  }
  return tags
    .flatMap((tag) => {
      const count = counts.get(tag.id);
      return count ? [{ tag, count }] : [];
    })
    .toSorted(
      (left, right) => right.count - left.count || compareNames(left.tag.name, right.tag.name),
    )
    .slice(0, limit);
}
