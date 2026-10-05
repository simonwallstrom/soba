import { Avatar, AvatarFallback, AvatarImage } from "@client/components/ui/avatar";
import { badgeVariants } from "@client/components/ui/badge";
import { getInitials } from "@client/features/household/members";
import type { HouseholdMember } from "@client/features/household/members";
import type { Tag } from "@shared/recipes";
import { Link } from "@tanstack/react-router";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

// Who added the recipe and when, and the site an imported recipe came from. The author shows once
// members load and links to their recipes.
export function RecipeByline({
  author,
  createdAt,
  sourceUrl = null,
}: {
  author: HouseholdMember | undefined;
  createdAt: Date;
  sourceUrl?: string | null;
}) {
  const sourceHost = sourceUrl ? hostname(sourceUrl) : null;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-olive-500">
      {author && (
        <>
          <Link
            aria-label={`Show recipes added by ${author.name}`}
            className="inline-flex items-center gap-2 rounded-full hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
            search={{ authors: [author.id] }}
            to="/recipes"
          >
            <Avatar aria-hidden="true" size="sm">
              {author.image && <AvatarImage src={author.image} />}
              <AvatarFallback>{getInitials(author.name)}</AvatarFallback>
            </Avatar>
            <span>{author.name}</span>
          </Link>
          <span aria-hidden="true">·</span>
        </>
      )}
      <time dateTime={createdAt.toISOString()}>{dateFormat.format(createdAt)}</time>
      {sourceUrl && sourceHost && (
        <>
          <span aria-hidden="true">·</span>
          <a
            className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
            href={sourceUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            {sourceHost}
          </a>
        </>
      )}
    </div>
  );
}

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./u, "");
  } catch {
    return null;
  }
}

// Each tag links to the recipe list filtered by it.
export function RecipeTagLinks({ tags }: { tags: readonly Tag[] }) {
  if (tags.length === 0) return null;

  return (
    <ul aria-label="Tags" className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        // Flex, so the badge sets the row height instead of a taller text line around it.
        <li className="flex" key={tag.id}>
          <Link
            aria-label={`Filter recipes by tag: ${tag.name}`}
            className={badgeVariants({
              className:
                "transition-colors hover:bg-black/12 focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:bg-white/12",
            })}
            search={{ tags: [tag.id] }}
            to="/recipes"
          >
            {tag.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}
