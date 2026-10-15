import { SobaLogo } from "@client/components/ui/icons";
import { cn } from "cn";
import type { ReactNode } from "react";

// The food drawings in the corners of the landing page and the screens before the app.
export function FoodIllustrations({ small = false }: { small?: boolean }) {
  return (
    <>
      <div
        className={cn(
          "pointer-events-none fixed top-0 left-0 -z-10 motion-safe:animate-[fade-in_0.5s_ease-in-out] sm:max-w-none",
          small ? "max-w-36" : "max-w-64",
        )}
      >
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
    </>
  );
}

// A card centered on the landing page's background, for the steps between logging in and the
// app: creating or joining a household. `footer` sits under the card, for a way out.
export function WelcomeLayout({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="relative isolate flex flex-1 flex-col items-center justify-center gap-8 overflow-y-auto px-4 py-16 pt-[calc(4rem+env(safe-area-inset-top))] pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <SobaLogo className="w-18 shrink-0 text-olive-900 dark:text-olive-100" />
      {/* A one-off: a hairline ring and layered shadows, from tight to wide, so the card reads
          crisp up close and soft further out. In dark mode, a glow along the top edge instead, like
          the menus and popovers. */}
      <div className="flex w-full max-w-md flex-col gap-6 rounded-2xl bg-white p-6 shadow-[0_0_0_0.5px_rgb(0_0_0/0.14),0_1px_1px_rgb(0_0_0/0.03),0_2px_4px_rgb(0_0_0/0.03),0_8px_16px_-4px_rgb(0_0_0/0.05),0_24px_48px_-12px_rgb(0_0_0/0.1)] sm:p-8 dark:bg-olive-925 dark:shadow-[inset_0_0.5px_0_rgb(255_255_255/0.14),0_0_0_0.5px_rgb(255_255_255/0.1),0_24px_48px_-12px_rgb(0_0_0/0.4)]">
        {children}
      </div>
      {footer && (
        <div className="text-center text-sm text-olive-500 dark:text-olive-400">{footer}</div>
      )}
      {/* Smaller on phones, so the drawing ends left of the logo instead of behind it. */}
      <FoodIllustrations small />
    </main>
  );
}

// The step's title and what it's for, at the top of the card. `eyebrow` is a small line above
// the title, like which step this is or who sent an invite.
export function WelcomeHeader({
  description,
  eyebrow,
  title,
}: {
  description: ReactNode;
  eyebrow?: ReactNode;
  title: string;
}) {
  return (
    <header className="flex flex-col gap-2">
      {eyebrow && (
        <div className="flex items-center gap-2 text-sm font-medium text-olive-500">{eyebrow}</div>
      )}
      <h1 className="font-serif text-3xl text-balance">{title}</h1>
      <p className="text-pretty text-olive-600 dark:text-olive-400">{description}</p>
    </header>
  );
}
