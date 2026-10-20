import { formatMetaTitle } from "@client/lib/meta";
import type { ReactNode } from "react";

// A legal document: its title, when it last changed, and a plain-language summary before the
// formal sections.
export function LegalDocument({
  children,
  summary,
  title,
  updated,
}: {
  children: ReactNode;
  summary: ReactNode;
  title: string;
  updated: string;
}) {
  return (
    <article className="flex flex-col gap-10">
      <title>{formatMetaTitle(title)}</title>
      <header className="flex flex-col gap-3">
        <h1 className="font-serif text-4xl text-balance">{title}</h1>
        <p className="text-sm text-olive-500">Last updated {updated}</p>
      </header>
      {/* Pulled out by its padding on wider screens, so its text lines up with the title. */}
      <div className="rounded-xl bg-olive-50 p-5 text-pretty text-olive-800 sm:-mx-5 dark:bg-olive-900 dark:text-olive-200">
        {summary}
      </div>
      <div className="flex flex-col gap-10 [counter-reset:section]">{children}</div>
    </article>
  );
}

// One numbered section, with an anchor so it can be linked to, like /privacy#your-rights.
export function LegalSection({
  children,
  id,
  title,
}: {
  children: ReactNode;
  id: string;
  title: string;
}) {
  return (
    <section
      aria-labelledby={id}
      className="flex scroll-mt-8 flex-col gap-3 leading-7 text-pretty text-olive-700 [counter-increment:section] dark:text-olive-300 [&_a]:underline [&_a]:underline-offset-2 [&_strong]:font-medium [&_strong]:text-olive-900 dark:[&_strong]:text-olive-100 [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1.5 [&_ul]:pl-5"
    >
      <h2
        // On wider screens the number hangs in the margin, so titles line up with the text.
        className="relative text-lg font-medium text-olive-950 before:mr-2 before:text-olive-400 before:tabular-nums before:content-[counter(section)] sm:before:absolute sm:before:right-full sm:before:mr-0 sm:before:pr-3 dark:text-olive-50"
        id={id}
      >
        <a className="no-underline! hover:underline!" href={`#${id}`}>
          {title}
        </a>
      </h2>
      {children}
    </section>
  );
}
