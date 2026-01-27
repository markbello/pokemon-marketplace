'use client';

import { type ReactNode, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TogglePill } from '@/components/ui/toggle-pill';
import Footer from '@/components/home/Footer';

const browseMarketplaceOptions = ['Browse', 'Marketplace'] as const;
type BrowseMarketplaceOption = (typeof browseMarketplaceOptions)[number];

interface HomePageClientProps {
  browseContent: ReactNode;
}

export default function HomePageClient({ browseContent }: HomePageClientProps) {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<BrowseMarketplaceOption>('Browse');

  // Handle mode change - animate toggle then navigate
  const handleModeChange = (mode: BrowseMarketplaceOption) => {
    if (mode === 'Marketplace') {
      setSelectedMode(mode); // Update toggle immediately for animation
      setTimeout(() => {
        router.push('/my-marketplace');
      }, 150); // Small delay for toggle animation
    }
    // Already on Browse (homepage), do nothing
  };

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="space-y-16">
          {/* Hero Section */}
          <section className="space-y-6 text-center">
            <div className="space-y-3">
              <p className="text-muted-foreground text-xs font-semibold tracking-[0.4em]">KADO</p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                Discover, Trade, and Own Graded Pokémon Cards
              </h1>
              <p className="text-muted-foreground text-base">
                Browse graded Pokémon cards and connect with other collectors.
              </p>
            </div>

            {/* Browse/Marketplace Toggle */}
            <div className="flex justify-center">
              <TogglePill
                options={browseMarketplaceOptions}
                value={selectedMode}
                onChange={handleModeChange}
              />
            </div>

            {/* Search bar */}
            <div className="border-muted/60 bg-background/80 mx-auto flex w-full max-w-4xl items-center gap-2 rounded-full border px-4 py-2 shadow-sm">
              <span className="text-muted-foreground inline-flex size-4 items-center justify-center">
                <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="m20.7 19.3-4.4-4.4a7 7 0 1 0-1.4 1.4l4.4 4.4a1 1 0 0 0 1.4-1.4ZM5 11a6 6 0 1 1 12 0 6 6 0 0 1-12 0Z"
                  />
                </svg>
              </span>
              <input
                type="search"
                placeholder="Search by card name, card #, or set"
                className="placeholder:text-muted-foreground w-full bg-transparent text-sm outline-none"
              />
              <button
                type="button"
                className="border-muted text-muted-foreground hover:text-foreground inline-flex size-8 items-center justify-center rounded-full border text-xs font-semibold"
              >
                <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M12 16a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm7-12H5a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3Zm1 13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1Zm-8-8a3 3 0 1 0 3 3 3 3 0 0 0-3-3Z"
                  />
                </svg>
              </button>
            </div>
          </section>

          {/* Browse Content */}
          {browseContent}

          <Footer />
        </div>
      </div>
    </div>
  );
}
