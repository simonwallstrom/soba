import { MediaGridItem, MediaItems, MediaListItem } from "@client/components/particles/media-item";
import { Badge } from "@client/components/ui/badge";
import { ServingFoodIcon } from "@client/components/ui/icons";
import type { HouseholdMember } from "@client/features/household/members";
import type { Recipe, RecipeDetail, RecipeView, Tag } from "@shared/recipes";
import { Fragment } from "react";
import type { ReactNode } from "react";

// A recipe with what its list item shows. The author is missing until members load.
export type RecipeListEntry = {
  recipe: Recipe;
  tags: readonly Tag[];
  author: HouseholdMember | undefined;
};

// Which of the recipe's dates its item shows, if any.
export type RecipeListDate = "created" | "updated" | undefined;

type DetailsProps = {
  entry: RecipeListEntry;
  date: RecipeListDate;
  visibleDetails: readonly RecipeDetail[];
};

export function RecipeList({
  entries,
  highlightedIds,
  newIds,
  renderActions,
  view,
  ...detailsProps
}: Omit<DetailsProps, "entry"> & {
  entries: readonly RecipeListEntry[];
  // Recipes that just arrived, such as imports.
  highlightedIds?: ReadonlySet<string>;
  // Recipes shown out of sort order because they are new, marked so the order makes sense.
  newIds?: ReadonlySet<string>;
  renderActions: (entry: RecipeListEntry) => ReactNode;
  view: RecipeView;
}) {
  const Item = view === "grid" ? MediaGridItem : MediaListItem;
  const Details = view === "grid" ? RecipeGridDetails : RecipeListDetails;
  return (
    <MediaItems view={view}>
      {entries.map((entry) => (
        <Item
          actions={renderActions(entry)}
          badge={newIds?.has(entry.recipe.id) && <Badge variant="primary">New</Badge>}
          details={<Details entry={entry} {...detailsProps} />}
          imageUrl={entry.recipe.imageUrl}
          isHighlighted={highlightedIds?.has(entry.recipe.id)}
          key={entry.recipe.id}
          link={{ to: "/recipes/$recipeId", params: { recipeId: entry.recipe.id } }}
          placeholderIcon={<ServingFoodIcon />}
          title={entry.recipe.title}
        />
      ))}
    </MediaItems>
  );
}

function getDetails({ entry, date, visibleDetails }: DetailsProps) {
  const { recipe, author, tags } = entry;
  return {
    authorName: visibleDetails.includes("author") ? author?.name : undefined,
    date: date === "created" ? recipe.createdAt : date === "updated" ? recipe.updatedAt : undefined,
    tagNames: visibleDetails.includes("tags") ? tags.map((tag) => tag.name) : [],
  };
}

function RecipeListDetails(props: DetailsProps) {
  const { authorName, date, tagNames } = getDetails(props);
  const parts = [
    authorName && { key: "author", content: authorName },
    date && { key: "date", content: <RecipeDate date={date} /> },
    tagNames.length > 0 && { key: "tags", content: tagNames.join(" ") },
  ].filter((part) => !!part);

  return parts.map((part, index) => (
    <Fragment key={part.key}>
      {index > 0 && <span aria-hidden="true"> · </span>}
      {part.content}
    </Fragment>
  ));
}

function RecipeGridDetails(props: DetailsProps) {
  const { authorName, date, tagNames } = getDetails(props);

  return (
    <>
      {(authorName || date) && (
        <div className="flex min-w-0 items-center justify-between gap-3">
          {authorName && <span className="min-w-0 truncate">{authorName}</span>}
          {date && <RecipeDate className="shrink-0 whitespace-nowrap" date={date} />}
        </div>
      )}
      {tagNames.length > 0 && (
        <div className="flex min-w-0 flex-wrap gap-x-2 text-olive-500">
          {tagNames.map((name) => (
            <span className="whitespace-nowrap" key={name}>
              {name}
            </span>
          ))}
        </div>
      )}
    </>
  );
}

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function RecipeDate({ className, date }: { className?: string; date: Date }) {
  return (
    <time className={className} dateTime={date.toISOString()}>
      {dateFormat.format(date)}
    </time>
  );
}
