const collectors = [
  {
    name: 'Kabuto King',
    description:
      "The kabuto king's collection continues to grow and make waves across the hobby and pokemon world.",
  },
  {
    name: 'Kabuto King',
    description:
      "The kabuto king's collection continues to grow and make waves across the hobby and pokemon world.",
  },
  {
    name: 'Kabuto King',
    description:
      "The kabuto king's collection continues to grow and make waves across the hobby and pokemon world.",
  },
  {
    name: 'Kabuto King',
    description:
      "The kabuto king's collection continues to grow and make waves across the hobby and pokemon world.",
  },
];

export default function PopularCollectors() {
  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold">Popular Collectors</h2>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {collectors.map((collector, index) => (
          <div
            key={`${collector.name}-${index}`}
            className="rounded-2xl bg-[#1c1c1c] px-6 pb-6 pt-16 text-white shadow-sm"
          >
            <div className="mb-6 h-20 w-full rounded-xl bg-[radial-gradient(circle,#3a3a3a_1px,transparent_1px)] [background-size:10px_10px]" />
            <div className="space-y-2">
              <p className="text-sm font-semibold">
                {collector.name} <span className="text-base">🔥</span>
              </p>
              <p className="text-xs text-white/70">{collector.description}</p>
            </div>
            <button
              type="button"
              className="mt-4 inline-flex items-center gap-2 text-xs text-white/80 transition hover:text-white"
            >
              Learn more
              <span aria-hidden="true">→</span>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
