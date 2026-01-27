'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { TogglePill } from '@/components/ui/toggle-pill';
import { Button } from '@/components/ui/button';
import {
  MarketplaceGrid,
  MarketplaceListView,
  type MarketplaceCardData,
  type SortOrder,
  type ViewMode,
} from '@/components/marketplace';
import Footer from '@/components/home/Footer';

interface ApiListing {
  id: string;
  displayIndex: number;
  displayTitle: string;
  askingPriceCents: number;
  currency: string;
  status: 'DRAFT' | 'PUBLISHED' | 'SOLD';
  imageUrl: string | null;
  additionalImageCount: number;
  card: {
    id: string;
    cardName: string | null;
    setName: string | null;
    cardNumber: string | null;
    variety: string | null;
    frontImageUrl: string | null;
  } | null;
  gradingCertificate: {
    id: string;
    gradingCompany: string;
    certNumber: string;
    grade: number | null;
    gradeLabel: string | null;
  } | null;
}

interface ApiResponse {
  listings: ApiListing[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// Local storage key for view mode preference
const VIEW_MODE_KEY = 'marketplace-view-mode';

const marketplaceOptions = ["Friend's Marketplace", 'My Marketplace'] as const;
type MarketplaceOption = (typeof marketplaceOptions)[number];

export default function MyMarketplacePage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();

  // Toggle state for animation
  const [selectedTab, setSelectedTab] = useState<MarketplaceOption>('My Marketplace');

  // Local state for sort and view mode
  const [sortOrder, setSortOrder] = useState<SortOrder>('latest');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Listings state by status
  const [liveCards, setLiveCards] = useState<MarketplaceCardData[]>([]);
  const [soldCards, setSoldCards] = useState<MarketplaceCardData[]>([]);
  const [draftCards, setDraftCards] = useState<MarketplaceCardData[]>([]);

  // Loading and pagination state
  const [isLoadingMarketplace, setIsLoadingMarketplace] = useState(false);
  const [liveHasMore, setLiveHasMore] = useState(false);
  const [soldHasMore, setSoldHasMore] = useState(false);
  const [draftHasMore, setDraftHasMore] = useState(false);
  const [livePage, setLivePage] = useState(1);
  const [soldPage, setSoldPage] = useState(1);
  const [draftPage, setDraftPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState<'live' | 'sold' | 'draft' | null>(null);

  // Load view mode preference from localStorage
  useEffect(() => {
    const savedViewMode = localStorage.getItem(VIEW_MODE_KEY);
    if (savedViewMode === 'grid' || savedViewMode === 'list') {
      setViewMode(savedViewMode);
    }
  }, []);

  // Save view mode preference to localStorage
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
  };

  // Transform API listing to card data
  const transformListing = (listing: ApiListing): MarketplaceCardData => ({
    id: listing.id,
    displayIndex: listing.displayIndex,
    displayTitle: listing.displayTitle,
    cardName: listing.card?.cardName || null,
    setName: listing.card?.setName || null,
    cardNumber: listing.card?.cardNumber || null,
    variety: listing.card?.variety || null,
    imageUrl: listing.imageUrl || listing.card?.frontImageUrl || null,
    askingPriceCents: listing.askingPriceCents,
    currency: listing.currency,
    status: listing.status,
    gradingCompany: listing.gradingCertificate?.gradingCompany || null,
    grade: listing.gradingCertificate?.grade || null,
    gradeLabel: listing.gradingCertificate?.gradeLabel || null,
    additionalImageCount: listing.additionalImageCount || 0,
  });

  // Fetch listings for a specific status
  const fetchListings = useCallback(
    async (status: 'LIVE' | 'SOLD' | 'DRAFT', page = 1, append = false) => {
      try {
        const params = new URLSearchParams({
          status,
          sort: sortOrder === 'oldest' ? 'oldest' : 'latest',
          page: page.toString(),
          limit: '10',
        });

        const response = await fetch(`/api/seller/listings?${params.toString()}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch listings');
        }

        const data: ApiResponse = await response.json();
        const transformedListings = data.listings.map(transformListing);

        // Update the appropriate state based on status
        const setCards =
          status === 'LIVE' ? setLiveCards : status === 'SOLD' ? setSoldCards : setDraftCards;
        const setHasMore =
          status === 'LIVE' ? setLiveHasMore : status === 'SOLD' ? setSoldHasMore : setDraftHasMore;
        const setPage =
          status === 'LIVE' ? setLivePage : status === 'SOLD' ? setSoldPage : setDraftPage;

        if (append) {
          setCards((prev) => [...prev, ...transformedListings]);
        } else {
          setCards(transformedListings);
        }

        setHasMore(data.pagination.hasMore);
        setPage(data.pagination.page);
      } catch (error) {
        console.error(`Error fetching ${status} listings:`, error);
        toast.error(`Failed to load ${status.toLowerCase()} listings`);
      }
    },
    [sortOrder]
  );

  // Fetch all listings on mount
  useEffect(() => {
    if (!user) return;

    const loadAllListings = async () => {
      setIsLoadingMarketplace(true);
      await Promise.all([
        fetchListings('LIVE'),
        fetchListings('SOLD'),
        fetchListings('DRAFT'),
      ]);
      setIsLoadingMarketplace(false);
    };

    loadAllListings();
  }, [user, fetchListings]);

  // Handle load more
  const handleLoadMore = async (status: 'live' | 'sold' | 'draft') => {
    setLoadingMore(status);
    const nextPage = status === 'live' ? livePage + 1 : status === 'sold' ? soldPage + 1 : draftPage + 1;
    await fetchListings(status.toUpperCase() as 'LIVE' | 'SOLD' | 'DRAFT', nextPage, true);
    setLoadingMore(null);
  };

  // Handle edit card
  const handleEditCard = (id: string) => {
    router.push(`/sell/create?edit=${id}`);
  };

  // Handle sort change - refetch all with new sort
  const handleSortChange = async (sort: SortOrder) => {
    setSortOrder(sort);
  };

  // Handle marketplace tab change - animate toggle then navigate
  const handleMarketplaceTabChange = (tab: MarketplaceOption) => {
    if (tab === "Friend's Marketplace") {
      setSelectedTab(tab); // Update toggle immediately for animation
      setTimeout(() => {
        router.push('/friends-marketplace');
      }, 150); // Small delay for toggle animation
    }
    // Already on My Marketplace, do nothing
  };

  // Render section based on view mode
  const renderSection = (
    title: string,
    cards: MarketplaceCardData[],
    status: 'live' | 'sold' | 'draft',
    hasMore: boolean
  ) => {
    const emptyMessages: Record<string, string> = {
      live: 'You have no live listings. Create one to start selling!',
      sold: 'No sold cards yet. Your sales history will appear here.',
      draft: 'No draft listings. Start a new listing to save as draft.',
    };

    const commonProps = {
      title,
      cards,
      sortOrder,
      onSortChange: handleSortChange,
      viewMode,
      onViewModeChange: handleViewModeChange,
      onEditCard: handleEditCard,
      onLoadMore: () => handleLoadMore(status),
      hasMore,
      isLoading: loadingMore === status,
      emptyMessage: emptyMessages[status],
    };

    return viewMode === 'grid' ? (
      <MarketplaceGrid {...commonProps} />
    ) : (
      <MarketplaceListView {...commonProps} />
    );
  };

  // Not logged in
  if (!user && !userLoading) {
    return (
      <div className="container mx-auto px-4 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="space-y-16">
            {/* Hero Section */}
            <section className="space-y-6 text-center">
              <div className="space-y-3">
                <p className="text-muted-foreground text-xs font-semibold tracking-[0.4em]">KADO</p>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                  My Marketplace
                </h1>
                <p className="text-muted-foreground text-base">
                  Manage your listings, track sales, and grow your collection.
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

            {/* Sign in prompt */}
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
              <p className="text-sm text-muted-foreground">Please sign in to view your marketplace</p>
              <Button className="mt-4" onClick={() => router.push('/api/auth/login?returnTo=/my-marketplace')}>
                Sign In
              </Button>
            </div>

            <Footer />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="space-y-16">
          {/* Hero Section */}
          <section className="space-y-6 text-center">
            <div className="space-y-3">
              <p className="text-muted-foreground text-xs font-semibold tracking-[0.4em]">KADO</p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                My Marketplace
              </h1>
              <p className="text-muted-foreground text-base">
                Manage your listings, track sales, and grow your collection.
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
            <TogglePill
              options={marketplaceOptions}
              value={selectedTab}
              onChange={handleMarketplaceTabChange}
            />

            {/* Loading State */}
            {(isLoadingMarketplace || userLoading) ? (
              <div className="flex min-h-[300px] items-center justify-center">
                <div className="text-center">
                  <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-muted-foreground">Loading your marketplace...</p>
                </div>
              </div>
            ) : (
              /* Listings Sections */
              <div className="space-y-12">
                {renderSection('My Live Cards', liveCards, 'live', liveHasMore)}
                {renderSection('My Sold Cards', soldCards, 'sold', soldHasMore)}
                {renderSection('My Draft Cards', draftCards, 'draft', draftHasMore)}
              </div>
            )}
          </div>

          <Footer />
        </div>
      </div>
    </div>
  );
}
