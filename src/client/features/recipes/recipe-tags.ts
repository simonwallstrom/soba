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
