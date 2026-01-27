'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TogglePill } from '@/components/ui/toggle-pill';
import Footer from '@/components/home/Footer';

const marketplaceOptions = ["Friend's Marketplace", 'My Marketplace'] as const;
type MarketplaceOption = (typeof marketplaceOptions)[number];

export default function FriendsMarketplacePage() {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState<MarketplaceOption>("Friend's Marketplace");

  // Handle marketplace tab change - animate toggle then navigate
  const handleMarketplaceTabChange = (tab: MarketplaceOption) => {
    if (tab === 'My Marketplace') {
      setSelectedTab(tab); // Update toggle immediately for animation
      setTimeout(() => {
        router.push('/my-marketplace');
      }, 150); // Small delay for toggle animation
    }
    // Already on Friend's Marketplace, do nothing
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
                Friend&apos;s Marketplace
              </h1>
              <p className="text-muted-foreground text-base">
                Discover cards from collectors you follow.
              </p>
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

          {/* Marketplace Content */}
          <div className="space-y-8">
            {/* Marketplace Tabs */}
            <div className="flex items-center justify-between">
              <TogglePill
                options={marketplaceOptions}
                value={selectedTab}
                onChange={handleMarketplaceTabChange}
              />
            </div>

            {/* Coming Soon Placeholder */}
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
              <svg
                className="h-12 w-12 text-muted-foreground/50"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <p className="mt-4 text-sm text-muted-foreground">Friend&apos;s Marketplace coming soon</p>
              <p className="mt-2 max-w-md text-center text-xs text-muted-foreground/70">
                Soon you&apos;ll be able to browse and purchase cards from collectors you follow.
              </p>
            </div>
          </div>

          <Footer />
        </div>
      </div>
    </div>
  );
}
