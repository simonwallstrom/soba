import { GoogleIcon, SobaLogoWithKana } from "@client/components/ui/icons";
import { signInErrorMessage, signInGoogle } from "@client/lib/auth";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import * as v from "valibot";

export const Route = createFileRoute("/")({
  codeSplitGroupings: [],
  validateSearch: v.object({ error: v.optional(v.string()) }),
  component: Start,
});

function Start() {
  const { error: callbackError } = Route.useSearch();
  const [signInError, setSignInError] = useState(
    callbackError ? signInErrorMessage(callbackError) : "",
  );
  const [signingIn, setSigningIn] = useState(false);

  async function logIn() {
    setSigningIn(true);
    setSignInError("");
    try {
      await signInGoogle({ callbackURL: "/recipes", errorCallbackURL: "/" });
    } catch (error) {
      setSignInError(error instanceof Error ? error.message : "Could not log in");
      setSigningIn(false);
    }
  }

  return (
    <>
      <title>Soba · Recipe organizer for families</title>
      <main className="relative isolate flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-40">
        <div className="flex flex-col items-center gap-4 text-center">
          <h1>
            <SobaLogoWithKana className="h-auto w-50 text-olive-900 dark:text-olive-100" />
            <span className="sr-only">Soba</span>
          </h1>

          <p className="font-medium text-olive-600 dark:text-olive-400">
            Recipe organizer for families
          </p>
        </div>

        {/* Explicit insets: WebKit (all iOS browsers) misplaces absolute flex children left to their static position. */}
        <footer className="absolute inset-x-6 bottom-[calc(2rem+env(safe-area-inset-bottom))] z-10 flex flex-col items-center gap-8 text-center">
          <button
            className="inline-flex h-10 items-center justify-center gap-3 rounded-full bg-olive-900 px-10 font-medium text-olive-50 select-none hover:bg-olive-950 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-99 dark:bg-olive-200 dark:text-olive-950 dark:hover:bg-olive-100"
            disabled={signingIn}
            onClick={() => void logIn()}
          >
            <GoogleIcon className="-ml-0.5" />
            <span>{signingIn ? "Logging in…" : "Login with Google"}</span>
          </button>
          {signInError && <p role="alert">{signInError}</p>}
          <nav
            aria-label="Footer"
            className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm font-medium text-olive-600 dark:text-olive-400"
          >
            <Link
              to="/request-access"
              className="hover:text-olive-900 focus-visible:outline-2 dark:hover:text-olive-200"
            >
              Request access
            </Link>
            <Link
              to="/terms"
              className="hover:text-olive-900 focus-visible:outline-2 dark:hover:text-olive-200"
            >
              Terms of use
            </Link>
            <Link
              to="/privacy"
              className="hover:text-olive-900 focus-visible:outline-2 dark:hover:text-olive-200"
            >
              Privacy policy
            </Link>
          </nav>
        </footer>

        <div className="pointer-events-none fixed top-0 left-0 -z-10 max-w-64 motion-safe:animate-[fade-in_0.5s_ease-in-out] sm:max-w-none">
          <img
            className="dark:opacity-60"
            alt=""
            height="398"
            src="/images/food-illustration-top-left.avif"
            width="338"
          />
        </div>
        <div className="pointer-events-none fixed right-0 bottom-0 -z-10 hidden motion-safe:animate-[fade-in_0.5s_ease-in-out] md:block">
          <img
            className="dark:opacity-60"
            alt=""
            height="336"
            src="/images/food-illustration-bottom-right.avif"
            width="416"
          />
        </div>
      </main>
    </>
  );
}
