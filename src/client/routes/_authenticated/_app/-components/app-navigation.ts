import { Calendar03Icon, CookBookIcon, Settings01Icon } from "@client/components/ui/icons";

export const destinations = {
  recipes: { icon: CookBookIcon, label: "Recipes", to: "/recipes" },
  mealPlanner: { icon: Calendar03Icon, label: "Meal planner", to: "/meal-planner" },
  settings: { icon: Settings01Icon, label: "Settings", to: "/settings" },
} as const;

export const desktopNavigation = [destinations.recipes, destinations.mealPlanner] as const;

export const mobileNavigation = [...desktopNavigation, destinations.settings] as const;
