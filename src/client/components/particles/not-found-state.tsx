import { buttonVariants } from "@client/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyIllustration,
  EmptyTitle,
} from "@client/components/ui/empty";
import { formatMetaTitle } from "@client/lib/meta";
import { Link } from "@tanstack/react-router";

// What every "not found" in the app looks like: an empty state in the page area, inside the app
// layout, with a way back to the recipes. Only the wording changes, like for a deleted recipe.
export function NotFoundState({
  description,
  linkLabel,
  title,
}: {
  description: string;
  linkLabel: string;
  title: string;
}) {
  return (
    <Empty className="min-h-full">
      <title>{formatMetaTitle(title)}</title>
      <EmptyIllustration
        height="512"
        src="/images/empty-recipes-no-results-bowl.avif"
        width="512"
      />
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      <Link className={buttonVariants()} to="/recipes">
        {linkLabel}
      </Link>
    </Empty>
  );
}
