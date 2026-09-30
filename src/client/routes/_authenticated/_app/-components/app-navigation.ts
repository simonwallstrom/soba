import {
  Calendar03Icon,
  CookBookIcon,
  Layers01Icon,
  Search01Icon,
  Settings01Icon,
} from "@client/components/ui/icons";

export const destinations = {
  recipes: { icon: CookBookIcon, label: "Recipes", to: "/recipes" },
  collections: { icon: Layers01Icon, label: "Collections", to: "/collections" },
  mealPlanner: { icon: Calendar03Icon, label: "Meal planner", to: "/meal-planner" },
  search: { icon: Search01Icon, label: "Search", to: "/search" },
  settings: { icon: Settings01Icon, label: "Settings", to: "/settings" },
} as const;

export const desktopNavigation = [
  destinations.recipes,
  destinations.collections,
  destinations.mealPlanner,
] as const;

export const mobileNavigation = [
  ...desktopNavigation,
  destinations.search,
  destinations.settings,
] as const;
