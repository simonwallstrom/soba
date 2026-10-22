import { Button } from "@client/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyIllustration,
  EmptyTitle,
} from "@client/components/ui/empty";
import { formatMetaTitle } from "@client/lib/meta";
import { queryClient } from "@client/lib/query";
import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { cn } from "cn";
import { useEffect } from "react";

// Whether the error is a fetch that failed, rather than a bug: a query that couldn't load hands
// its error to the page as is.
function isFetchError(error: unknown) {
  return queryClient
    .getQueryCache()
    .getAll()
    .some((query) => query.state.error === error);
}

// What a page shows when it can't render, in the same style as "Page not found". Mostly a first
// visit that couldn't fetch the household's data, since with a stored copy to show, a failed fetch
// changes nothing; trying again fetches whatever failed. Anything else is a bug, which a reload
// usually gets past.
export function PageError({
  className,
  error,
  reset,
}: Pick<ErrorComponentProps, "error" | "reset"> & { className?: string }) {
  const router = useRouter();
  const { reset: resetQueries } = useQueryErrorResetBoundary();
  const fetchFailed = isFetchError(error);
  // Keeps the cause visible in the console behind the generic message.
  useEffect(() => console.error(error), [error]);

  return (
    <Empty className={cn("min-h-full", className)}>
      <title>{formatMetaTitle("Couldn’t load page")}</title>
      <EmptyIllustration
        height="512"
        src="/images/empty-recipes-no-results-bowl.avif"
        width="512"
      />
      <EmptyHeader>
        <EmptyTitle>{fetchFailed ? "Couldn’t load this page" : "Something went wrong"}</EmptyTitle>
        <EmptyDescription>
          {fetchFailed
            ? "Check your connection and try again."
            : "This page ran into a problem. Reloading usually fixes it."}
        </EmptyDescription>
        {import.meta.env.DEV && !fetchFailed && (
          <p className="mt-2 font-mono text-sm break-all text-olive-500">{String(error)}</p>
        )}
      </EmptyHeader>
      {fetchFailed ? (
        <Button
          onClick={() => {
            resetQueries();
            // Runs the loaders again too, in case one of them failed.
            void router.invalidate();
            reset();
          }}
        >
          Try again
        </Button>
      ) : (
        <Button onClick={() => window.location.reload()}>Reload page</Button>
      )}
    </Empty>
  );
}
