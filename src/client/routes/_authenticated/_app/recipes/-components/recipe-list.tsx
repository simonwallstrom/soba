import { Button } from "@client/components/ui/button";
import { ImageThumbnail } from "@client/components/ui/image-thumbnail";
import type { RecipeDetail, RecipeSort, RecipeView } from "@shared/recipes";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { Fragment } from "react";

import type { RecipeListEntry } from "../-recipe-list";
import { RecipeActionsMenu } from "./recipe-actions-menu";

type ItemProps = {
  entry: RecipeListEntry;
  sort: RecipeSort;
  visibleDetails: readonly RecipeDetail[];
};

export function RecipeList({
  entries,
  hasFilters,
  onClearFilters,
  view,
  ...itemProps
}: Omit<ItemProps, "entry"> & {
  entries: readonly RecipeListEntry[];
  hasFilters: boolean;
  onClearFilters: () => void;
  view: RecipeView;
}) {
  if (entries.length === 0) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-center">
        <p className="font-medium">{hasFilters ? "No matching recipes" : "No recipes yet"}</p>
        {hasFilters && (
          <Button onClick={onClearFilters} size="sm" variant="ghost">
            Clear filters
          </Button>
        )}
      </div>
    );
  }

  if (view === "grid") {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(17rem,1fr))]">
        {entries.map((entry) => (
          <RecipeGridItem entry={entry} key={entry.recipe.id} {...itemProps} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {entries.map((entry) => (
        <RecipeListItem entry={entry} key={entry.recipe.id} {...itemProps} />
      ))}
    </div>
  );
}

const itemStyles =
  "group relative rounded-2xl p-3 hover:bg-black/5 has-data-popup-open:bg-black/5 dark:hover:bg-white/6 dark:has-data-popup-open:bg-white/6";
const actionsStyles =
  "relative z-10 -mr-1.5 text-olive-500 transition-colors group-focus-within:text-olive-700 group-hover:text-olive-700 dark:group-focus-within:text-olive-300 dark:group-hover:text-olive-300";

// The whole item opens the recipe; the actions menu sits above the link.
function RecipeLink({ recipeId, title }: { recipeId: string; title: string }) {
  return (
    <Link
      aria-label={`Open ${title}`}
      className="absolute inset-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-1 active:bg-black/5 dark:active:bg-white/4"
      params={{ recipeId }}
      to="/recipes/$recipeId"
    />
  );
}

function RecipeListItem({ entry, sort, visibleDetails }: ItemProps) {
  const { recipe } = entry;
  return (
    <div className={cn(itemStyles, "flex items-center gap-3")}>
      <RecipeLink recipeId={recipe.id} title={recipe.title} />
      {recipe.imageUrl ? (
        <ImageThumbnail
          className="size-13 shrink-0"
          height={104}
          src={recipe.imageUrl}
          width={104}
        />
      ) : (
        <div
          aria-hidden="true"
          className="pointer-events-none size-13 shrink-0 rounded-lg bg-olive-200 dark:bg-olive-800"
        />
      )}
      <div className="pointer-events-none flex min-w-0 flex-1 flex-col gap-1">
        <div className="truncate font-medium">{recipe.title}</div>
        <RecipeListDetails entry={entry} sort={sort} visibleDetails={visibleDetails} />
      </div>
      <RecipeActionsMenu className={cn(actionsStyles, "ml-auto")} recipeTitle={recipe.title} />
    </div>
  );
}

function RecipeGridItem({ entry, sort, visibleDetails }: ItemProps) {
  const { recipe } = entry;
  return (
    <article className={cn(itemStyles, "min-w-0")}>
      <RecipeLink recipeId={recipe.id} title={recipe.title} />
      {recipe.imageUrl ? (
        <ImageThumbnail
          className="aspect-5/4 w-full"
          height={960}
          src={recipe.imageUrl}
          width={1200}
        />
      ) : (
        <div
          aria-hidden="true"
          className="pointer-events-none aspect-5/4 w-full rounded-lg bg-olive-200 dark:bg-olive-800"
        />
      )}
      <div className="mt-1.5 flex min-w-0 flex-col">
        <div className="flex min-w-0 items-center gap-1">
          <h2 className="pointer-events-none line-clamp-2 min-w-0 flex-1 font-medium text-balance">
            {recipe.title}
          </h2>
          <RecipeActionsMenu className={cn(actionsStyles, "shrink-0")} recipeTitle={recipe.title} />
        </div>
        <RecipeGridDetails entry={entry} sort={sort} visibleDetails={visibleDetails} />
      </div>
    </article>
  );
}

function getDetails({ entry, sort, visibleDetails }: ItemProps) {
  const { recipe, author, tags } = entry;
  const date =
    sort === "created" ? recipe.createdAt : sort === "updated" ? recipe.updatedAt : undefined;
  return {
    authorName: visibleDetails.includes("author") ? author?.name : undefined,
    date,
    tagNames: visibleDetails.includes("tags") ? tags.map((tag) => tag.name) : [],
  };
}

function RecipeListDetails(props: ItemProps) {
  const { authorName, date, tagNames } = getDetails(props);
  const parts = [
    authorName && { key: "author", content: authorName },
    date && { key: "date", content: <RecipeDate date={date} /> },
    tagNames.length > 0 && { key: "tags", content: tagNames.join(" ") },
  ].filter((part) => !!part);
  if (parts.length === 0) return null;

  return (
    <div className="truncate text-sm text-olive-500">
      {parts.map((part, index) => (
        <Fragment key={part.key}>
          {index > 0 && <span aria-hidden="true"> · </span>}
          {part.content}
        </Fragment>
      ))}
    </div>
  );
}

function RecipeGridDetails(props: ItemProps) {
  const { authorName, date, tagNames } = getDetails(props);
  if (!authorName && !date && tagNames.length === 0) return null;

  return (
    <div className="pointer-events-none flex flex-col gap-1 text-sm leading-5">
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
    </div>
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
