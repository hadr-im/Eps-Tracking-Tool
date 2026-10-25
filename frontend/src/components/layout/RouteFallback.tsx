/*
  Shown while a route's chunk is being fetched.

  Deliberately plain. A page's own skeleton describes a layout we do not know
  yet at this point — the code that defines it is still in flight — so imitating
  one here would mean flashing the wrong shape before the real skeleton
  appears. A centred spinner reads as "loading" without promising anything
  about what lands.
*/
export function RouteFallback() {
  return (
    <div
      className="flex h-full w-full items-center justify-center py-20"
      role="status"
      aria-label="Loading page"
    >
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/25 border-t-muted-foreground/70" />
    </div>
  );
}
