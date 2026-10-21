import { ServingFoodIcon } from "@client/components/ui/icons";
import { ImagePlaceholder } from "@client/components/ui/image-thumbnail";
import type { ReactNode } from "react";

// A recipe's photo, title, and description, for its page in the app and its shared page. The
// photo leads when the header is narrow and sits beside the text once there's room, going by
// the header's own width, as the app's sidebar takes some of the screen and the shared page's
// doesn't. The page pads its content less below `lg`, which the photo's bleed follows.
export function RecipeHeader({
  byline,
  children,
  description,
  imageUrl,
  title,
}: {
  byline: ReactNode;
  // Shown below the description, such as the recipe's tags.
  children?: ReactNode;
  description: string | null;
  imageUrl: string | null;
  title: string;
}) {
  return (
    <div className="@container">
      <header className="grid gap-6 @2xl:grid-cols-2 @2xl:items-center @2xl:gap-10 @4xl:gap-16">
        {imageUrl ? (
          <div className="relative -mx-5 -mt-5 lg:m-0 @2xl:col-start-2 @2xl:row-start-1 @2xl:m-0">
            <img
              alt={title}
              className="aspect-5/4 w-full object-cover lg:rounded-xl @2xl:rounded-xl"
              decoding="async"
              height="1100"
              src={imageUrl}
              width="1200"
            />
            {/* The hairline other images have, once the photo stops running edge to edge. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-xl ring-[0.5px] ring-black/20 ring-inset max-lg:@max-2xl:hidden dark:ring-white/20"
            />
          </div>
        ) : (
          <ImagePlaceholder className="aspect-5/4 w-full rounded-xl max-lg:@max-2xl:hidden @2xl:col-start-2 @2xl:row-start-1 [&_svg]:size-12">
            <ServingFoodIcon />
          </ImagePlaceholder>
        )}
        <div className="flex flex-col gap-3 @2xl:col-start-1 @2xl:row-start-1">
          {byline}
          <h1 className="font-serif text-3xl font-medium text-balance">{title}</h1>
          {description && (
            <p className="max-w-xl text-base text-pretty text-olive-600 dark:text-olive-400">
              {description}
            </p>
          )}
          <div className="mt-3 empty:hidden">{children}</div>
        </div>
      </header>
    </div>
  );
}
