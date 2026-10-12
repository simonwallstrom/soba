import { buttonVariants } from "@client/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyIllustration,
  EmptyTitle,
} from "@client/components/ui/empty";
import { formatMetaTitle } from "@client/lib/meta";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_app/shopping-list/")({
  staticData: { breadcrumbs: [{ label: "Shopping list" }] },
  component: ShoppingList,
});

// A placeholder, so the shopping list has its place in the app before it's built.
function ShoppingList() {
  return (
    <>
      <title>{formatMetaTitle("Shopping list")}</title>
      <div className="flex min-h-full flex-col p-2 lg:p-3">
        <Empty>
          <EmptyIllustration
            height="512"
            src="/images/empty-shopping-market-bag.avif"
            width="512"
          />
          <EmptyHeader>
            <EmptyTitle>Shopping list is coming soon</EmptyTitle>
            <EmptyDescription>
              Soon the week's meal plan turns into a shopping list to check off in the store.
            </EmptyDescription>
          </EmptyHeader>
          <Link className={buttonVariants()} to="/meal-planner">
            Plan meals
          </Link>
        </Empty>
      </div>
    </>
  );
}
