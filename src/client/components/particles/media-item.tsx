import { ImageThumbnail } from "@client/components/ui/image-thumbnail";
import { Link } from "@tanstack/react-router";
import type { LinkComponentProps } from "@tanstack/react-router";
import { cn } from "cn";
import type { ReactNode } from "react";

export type MediaView = "list" | "grid";

// Rows or cards that each open something, like recipes or collections.
export function MediaItems({ children, view }: { children: ReactNode; view: MediaView }) {
  return view === "grid" ? (
    <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(17rem,1fr))]">
      {children}
    </div>
  ) : (
    <div className="flex flex-col">{children}</div>
  );
}

type MediaItemProps = {
  title: string;
  link: Omit<LinkComponentProps, "aria-label" | "children" | "className">;
  imageUrl: string | null;
  // Centered in the image's place when there is no image.
  placeholderIcon: ReactNode;
  details?: ReactNode;
  actions?: ReactNode;
};

const itemStyles =
  "group relative rounded-2xl p-3 hover:bg-black/5 has-data-popup-open:bg-black/5 dark:hover:bg-white/6 dark:has-data-popup-open:bg-white/6";
const actionsStyles =
  "relative z-10 -mr-1.5 flex shrink-0 text-olive-500 transition-colors group-focus-within:text-olive-700 group-hover:text-olive-700 dark:group-focus-within:text-olive-300 dark:group-hover:text-olive-300";

export function MediaListItem({ actions, details, title, ...props }: MediaItemProps) {
  return (
    <div className={cn(itemStyles, "flex items-center gap-3")}>
      <MediaLink title={title} {...props} />
      <MediaImage className="size-13 shrink-0 [&_svg]:size-5" height={104} width={104} {...props} />
      <div className="pointer-events-none flex min-w-0 flex-1 flex-col gap-1">
        <div className="truncate font-medium">{title}</div>
        <div className="truncate text-sm text-olive-500 empty:hidden">{details}</div>
      </div>
      {actions && <div className={cn(actionsStyles, "ml-auto")}>{actions}</div>}
    </div>
  );
}

export function MediaGridItem({ actions, details, title, ...props }: MediaItemProps) {
  return (
    <article className={cn(itemStyles, "min-w-0")}>
      <MediaLink title={title} {...props} />
      <MediaImage
        className="aspect-5/4 w-full [&_svg]:size-8"
        height={960}
        width={1200}
        {...props}
      />
      <div className="mt-1.5 flex min-w-0 flex-col">
        <div className="flex min-w-0 items-center gap-1">
          <h2 className="pointer-events-none line-clamp-2 min-w-0 flex-1 font-medium text-balance">
            {title}
          </h2>
          {actions && <div className={actionsStyles}>{actions}</div>}
        </div>
        <div className="pointer-events-none flex flex-col gap-1 text-sm leading-5 empty:hidden">
          {details}
        </div>
      </div>
    </article>
  );
}

// The whole item opens the link; the actions sit above it.
function MediaLink({ link, title }: Pick<MediaItemProps, "link" | "title">) {
  return (
    <Link
      aria-label={`Open ${title}`}
      className="absolute inset-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-1 active:bg-black/5 dark:active:bg-white/4"
      {...link}
    />
  );
}

function MediaImage({
  className,
  height,
  imageUrl,
  placeholderIcon,
  width,
}: Pick<MediaItemProps, "imageUrl" | "placeholderIcon"> & {
  className: string;
  height: number;
  width: number;
}) {
  return imageUrl ? (
    <ImageThumbnail className={className} height={height} src={imageUrl} width={width} />
  ) : (
    // Quieter than a photo, with the same hairline border.
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none flex items-center justify-center rounded-lg bg-olive-100 text-olive-400 ring-[0.5px] ring-black/10 ring-inset dark:bg-olive-900 dark:text-olive-600 dark:ring-white/10",
        className,
      )}
    >
      {placeholderIcon}
    </div>
  );
}
