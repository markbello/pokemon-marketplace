import { CardsSection } from '@/components/cards/CardsSection';

export default function PopularCards() {
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">Popular Cards</h2>
          <p className="text-muted-foreground text-sm">
            Discover the most traded graded singles right now.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="border-muted text-muted-foreground hover:text-foreground rounded-full border px-3 py-1 text-xs font-medium transition"
          >
            Card Series
          </button>
          <button
            type="button"
            className="border-muted text-muted-foreground hover:text-foreground rounded-full border px-3 py-1 text-xs font-medium transition"
          >
            Rarity
          </button>
          <button
            type="button"
            className="border-muted text-muted-foreground hover:text-foreground rounded-full border px-3 py-1 text-xs font-medium transition"
          >
            Language
          </button>
        </div>
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <span>Sort: Latest</span>
          <button type="button" className="hover:text-foreground transition">
            <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
              <path
                fill="currentColor"
                d="M10 6h10v2H10V6ZM4 5h4v4H4V5Zm6 11h10v2H10v-2Zm-6-1h4v4H4v-4Zm6-4h10v2H10v-2Zm-6-1h4v4H4V10Z"
              />
            </svg>
          </button>
        </div>
      </div>

      <CardsSection showHeader={false} countLabel="Popular cards" />
      <div className="flex justify-center">
        <button
          type="button"
          className="bg-foreground text-background hover:bg-foreground/90 rounded-full px-6 py-2 text-sm font-medium transition"
        >
          Load more
        </button>
      </div>
    </section>
  );
}
