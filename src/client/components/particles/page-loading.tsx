import { formatMetaTitle } from "@client/lib/meta";

export function PageLoading() {
  return (
    <main className="flex flex-1 items-center justify-center" aria-busy="true">
      <title>{formatMetaTitle("Loading")}</title>
      <img alt="" height="48" src="/favicon-kana.svg" width="48" />
      <output className="sr-only">Loading Soba…</output>
    </main>
  );
}
