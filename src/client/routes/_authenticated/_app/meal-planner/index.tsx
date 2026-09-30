import { formatMetaTitle } from "@client/lib/meta";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_app/meal-planner/")({
  staticData: { breadcrumbs: [{ label: "Meal planner" }] },
  component: MealPlanner,
});

function MealPlanner() {
  return (
    <>
      <title>{formatMetaTitle("Meal planner")}</title>
      <div className="grid min-h-full place-items-center p-6">
        <p className="text-olive-500">Coming soon</p>
      </div>
    </>
  );
}
