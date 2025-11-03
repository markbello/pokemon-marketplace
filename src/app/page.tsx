export default async function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-4xl font-bold">Welcome to Pokemon Marketplace</h1>
        <p className="text-muted-foreground mb-8 text-lg">
          Buy and sell Pokemon cards with ease. Browse our marketplace or start selling today!
        </p>
        
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-2 text-2xl font-semibold">Browse Cards</h2>
            <p className="mb-4 text-muted-foreground">
              Explore our collection of Pokemon cards from sellers around the world.
            </p>
            <p className="text-sm text-muted-foreground">Coming soon...</p>
          </div>
          
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-2 text-2xl font-semibold">Start Selling</h2>
            <p className="mb-4 text-muted-foreground">
              List your Pokemon cards and reach buyers worldwide.
            </p>
            <p className="text-sm text-muted-foreground">Coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
