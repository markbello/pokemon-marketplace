'use client';

import { useEffect, useState, Suspense } from 'react';
import { useUser } from '@auth0/nextjs-auth0';
import { useRouter, useSearchParams } from 'next/navigation';
import { AccountLayout } from '@/components/account/AccountLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Loader2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Store,
  AlertCircle,
  Pencil,
  Package,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface SellerStatus {
  hasAccount: boolean;
  isVerified: boolean;
  status: {
    accountId: string;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
    isVerified: boolean;
  } | null;
}

interface Listing {
  id: string;
  sellerId: string;
  displayTitle: string;
  sellerNotes: string | null;
  askingPriceCents: number;
  currency: string;
  status: 'DRAFT' | 'PUBLISHED' | 'SOLD';
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  // Sale info (populated when SOLD)
  soldAt: string | null;
  orderId: string | null;
  buyerName: string | null;
  saleTotalCents: number | null;
}

function SellerDashboardContent() {
  const { user, isLoading: userLoading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<SellerStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingOnboarding, setIsStartingOnboarding] = useState(false);
  const [isOpeningDashboard, setIsOpeningDashboard] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [isSavingListing, setIsSavingListing] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newListingTitle, setNewListingTitle] = useState('');
  const [newListingPrice, setNewListingPrice] = useState('');
  const [newListingNotes, setNewListingNotes] = useState('');
  const [newListingImageUrl, setNewListingImageUrl] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editStatus, setEditStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT');

  // Check if user returned from Stripe onboarding
  useEffect(() => {
    const returnParam = searchParams.get('return');
    const refreshParam = searchParams.get('refresh');

    if (returnParam === 'true') {
      toast.success('Welcome back! Please wait while we verify your account...');
      // Refresh status after a short delay to allow Stripe to process
      setTimeout(() => {
        fetchStatus();
      }, 2000);
      // Clean up URL
      router.replace('/account/seller');
    } else if (refreshParam === 'true') {
      toast.info('Refreshing your onboarding status...');
      fetchStatus();
      router.replace('/account/seller');
    }
  }, [searchParams, router]);

  // Fetch seller status
  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/seller/status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || 'Failed to load seller status');
      }
    } catch (error) {
      console.error('Error fetching seller status:', error);
      toast.error('Failed to load seller status');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!userLoading && user) {
      fetchStatus();
    } else if (!userLoading && !user) {
      setIsLoading(false);
    }
  }, [user, userLoading]);

  // Fetch listings once seller is verified
  const fetchListings = async () => {
    try {
      const response = await fetch('/api/seller/listings');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to load listings');
      }
      const data = (await response.json()) as { listings: Listing[] };
      setListings(data.listings);
    } catch (error) {
      console.error('Error fetching listings:', error);
      toast.error('Failed to load listings');
    } finally {
    }
  };

  useEffect(() => {
    if (status?.hasAccount && status.isVerified) {
      fetchListings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.hasAccount, status?.isVerified]);

  const resetNewListingForm = () => {
    setNewListingTitle('');
    setNewListingPrice('');
    setNewListingNotes('');
    setNewListingImageUrl('');
  };

  const handleCreateListing = async () => {
    if (!newListingTitle || !newListingPrice) {
      toast.error('Please enter a title and price');
      return;
    }

    const parsedPrice = Number.parseFloat(newListingPrice);
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      toast.error('Price must be a non-negative number');
      return;
    }

    const askingPriceCents = Math.round(parsedPrice * 100);

    try {
      setIsSavingListing(true);
      const response = await fetch('/api/seller/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayTitle: newListingTitle,
          askingPriceCents,
          sellerNotes: newListingNotes || undefined,
          imageUrl: newListingImageUrl || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create listing');
      }

      const data = (await response.json()) as { listing: Listing };
      setListings((prev) => [data.listing, ...prev]);
      resetNewListingForm();
      toast.success('Listing created');
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Error creating listing:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create listing');
    } finally {
      setIsSavingListing(false);
    }
  };

  const beginEditListing = (listing: Listing) => {
    setEditingListing(listing);
    setEditTitle(listing.displayTitle);
    setEditPrice((listing.askingPriceCents / 100).toString());
    setEditNotes(listing.sellerNotes || '');
    setEditImageUrl(listing.imageUrl || '');
    setEditStatus(listing.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT');
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingListing) return;

    if (!editTitle || !editPrice) {
      toast.error('Please enter a title and price');
      return;
    }

    const parsedPrice = Number.parseFloat(editPrice);
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      toast.error('Price must be a non-negative number');
      return;
    }

    const askingPriceCents = Math.round(parsedPrice * 100);

    try {
      setIsSavingListing(true);
      const response = await fetch(`/api/seller/listings/${editingListing.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayTitle: editTitle,
          askingPriceCents,
          sellerNotes: editNotes || null,
          imageUrl: editImageUrl || null,
          status: editStatus,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update listing');
      }

      const data = (await response.json()) as { listing: Listing };
      setListings((prev) => prev.map((l) => (l.id === data.listing.id ? data.listing : l)));
      setEditingListing(null);
      setIsEditDialogOpen(false);
      toast.success('Listing updated');
    } catch (error) {
      console.error('Error updating listing:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update listing');
    } finally {
      setIsSavingListing(false);
    }
  };

  const handleUpdateStatus = async (listing: Listing, nextStatus: 'DRAFT' | 'PUBLISHED') => {
    try {
      setIsSavingListing(true);
      const response = await fetch(`/api/seller/listings/${listing.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update listing status');
      }

      const data = (await response.json()) as { listing: Listing };
      setListings((prev) => prev.map((l) => (l.id === data.listing.id ? data.listing : l)));
      toast.success(
        nextStatus === 'PUBLISHED' ? 'Listing published' : 'Listing moved back to draft',
      );
    } catch (error) {
      console.error('Error updating listing status:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update listing status');
    } finally {
      setIsSavingListing(false);
    }
  };

  // Handle starting onboarding
  const handleStartOnboarding = async () => {
    setIsStartingOnboarding(true);
    try {
      const response = await fetch('/api/seller/onboard', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to start onboarding');
      }

      const data = await response.json();
      // Redirect to Stripe onboarding
      window.location.href = data.onboardingUrl;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start onboarding';
      toast.error(errorMessage);
      setIsStartingOnboarding(false);
    }
  };

  // Handle opening Stripe dashboard
  const handleOpenDashboard = async () => {
    setIsOpeningDashboard(true);
    try {
      const response = await fetch('/api/seller/dashboard-link', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to open dashboard');
      }

      const data = await response.json();
      window.open(data.dashboardUrl, '_blank');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to open dashboard';
      toast.error(errorMessage);
    } finally {
      setIsOpeningDashboard(false);
    }
  };

  // Handle refresh status
  const handleRefreshStatus = () => {
    setIsLoading(true);
    fetchStatus();
  };

  if (userLoading || isLoading) {
    return (
      <AccountLayout>
        <div className="space-y-6">
          <div className="mb-6">
            <h1 className="mb-2 text-3xl font-bold">Seller Dashboard</h1>
            <p className="text-muted-foreground">Manage your seller account and payments</p>
          </div>
          {/* Reserve space for content card to prevent layout shift */}
          <Card>
            <CardContent className="flex min-h-[400px] items-center justify-center">
              <div className="text-center">
                <Loader2 className="text-muted-foreground mx-auto mb-4 h-8 w-8 animate-spin" />
                <p className="text-muted-foreground">Loading seller dashboard...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </AccountLayout>
    );
  }

  if (!user) {
    return (
      <AccountLayout>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Please log in to access the seller dashboard.</AlertDescription>
        </Alert>
      </AccountLayout>
    );
  }

  // No account state
  if (!status?.hasAccount) {
    return (
      <AccountLayout>
        <div className="space-y-6">
          <div className="mb-6">
            <h1 className="mb-2 text-3xl font-bold">Seller Dashboard</h1>
            <p className="text-muted-foreground">Start selling on Pokemon Marketplace</p>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Store className="h-6 w-6" />
                <div>
                  <CardTitle>Become a Seller</CardTitle>
                  <CardDescription>
                    Complete seller onboarding to start listing and selling Pokemon cards
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold">What you&apos;ll need:</h3>
                <ul className="text-muted-foreground list-inside list-disc space-y-1">
                  <li>Business information (individual or business)</li>
                  <li>Tax information (SSN or EIN)</li>
                  <li>Bank account details for payouts</li>
                  <li>Identity verification documents</li>
                </ul>
              </div>

              <div className="pt-4">
                <Button
                  onClick={handleStartOnboarding}
                  disabled={isStartingOnboarding}
                  size="lg"
                  className="w-full"
                >
                  {isStartingOnboarding ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Starting onboarding...
                    </>
                  ) : (
                    <>
                      Start Selling
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>

              <p className="text-muted-foreground text-sm">
                You&apos;ll be redirected to Stripe to complete the secure onboarding process. This
                typically takes 5-10 minutes.
              </p>
            </CardContent>
          </Card>
        </div>
      </AccountLayout>
    );
  }

  // Account exists but not verified
  if (status.hasAccount && !status.isVerified) {
    return (
      <AccountLayout>
        <div className="space-y-6">
          <div className="mb-6">
            <h1 className="mb-2 text-3xl font-bold">Seller Dashboard</h1>
            <p className="text-muted-foreground">Your seller account verification status</p>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Clock className="h-6 w-6 text-yellow-500" />
                <div>
                  <CardTitle>Verification Pending</CardTitle>
                  <CardDescription>
                    Your seller account is being verified. This usually takes 1-2 business days.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {status.status && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Account Details Submitted:</span>
                    <span className="text-sm font-medium">
                      {status.status.detailsSubmitted ? (
                        <span className="text-green-600">Yes</span>
                      ) : (
                        <span className="text-yellow-600">Pending</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Charges Enabled:</span>
                    <span className="text-sm font-medium">
                      {status.status.chargesEnabled ? (
                        <span className="text-green-600">Yes</span>
                      ) : (
                        <span className="text-yellow-600">No</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Payouts Enabled:</span>
                    <span className="text-sm font-medium">
                      {status.status.payoutsEnabled ? (
                        <span className="text-green-600">Yes</span>
                      ) : (
                        <span className="text-yellow-600">No</span>
                      )}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button onClick={handleRefreshStatus} variant="outline" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    'Refresh Status'
                  )}
                </Button>
                <Button
                  onClick={handleOpenDashboard}
                  variant="outline"
                  disabled={isOpeningDashboard}
                >
                  {isOpeningDashboard ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Opening...
                    </>
                  ) : (
                    <>
                      Open Stripe Dashboard
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You cannot list items or receive payments until your account is fully verified. If
                  you need to complete or update your information, click &quot;Open Stripe
                  Dashboard&quot; above.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </AccountLayout>
    );
  }

  // Verified seller - show seller features
  return (
    <AccountLayout>
      <div className="space-y-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold">Seller Dashboard</h1>
            <p className="text-muted-foreground">Manage your seller account and payments</p>
          </div>
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Verified Seller</span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Your Listings</CardTitle>
                <CardDescription>
                  Create and manage single-item listings that buyers can purchase directly.
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
                + New listing
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              {listings.length === 0 ? (
                <div className="rounded-md border border-dashed p-4">
                  <p className="text-sm font-medium">You haven&apos;t listed any items yet.</p>
                  <p className="text-muted-foreground text-sm">
                    Create your first listing to start selling. You can always unpublish or edit it
                    later using the New listing button above.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-2 pr-4">Title</th>
                        <th className="py-2 pr-4">Price</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4">Activity</th>
                        <th className="py-2 pr-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listings.map((listing) => (
                        <tr key={listing.id} className="border-b last:border-0">
                          <td className="py-2 pr-4">
                            <div className="font-medium">{listing.displayTitle}</div>
                            {listing.sellerNotes && (
                              <div className="text-muted-foreground line-clamp-2 text-xs">
                                {listing.sellerNotes}
                              </div>
                            )}
                            {listing.status === 'SOLD' && listing.buyerName && (
                              <div className="text-xs text-green-600 mt-0.5">
                                Sold to {listing.buyerName}
                              </div>
                            )}
                          </td>
                          <td className="py-2 pr-4">
                            <div>
                              {(listing.askingPriceCents / 100).toLocaleString('en-US', {
                                style: 'currency',
                                currency: listing.currency || 'USD',
                              })}
                            </div>
                            {listing.status === 'SOLD' && listing.saleTotalCents && listing.saleTotalCents !== listing.askingPriceCents && (
                              <div className="text-xs text-muted-foreground">
                                Total: {(listing.saleTotalCents / 100).toLocaleString('en-US', {
                                  style: 'currency',
                                  currency: listing.currency || 'USD',
                                })}
                              </div>
                            )}
                          </td>
                          <td className="py-2 pr-4">
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                                listing.status === 'PUBLISHED'
                                  ? 'bg-blue-100 text-blue-800'
                                  : listing.status === 'DRAFT'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-green-100 text-green-800'
                              }`}
                            >
                              {listing.status === 'SOLD' ? '✓ Sold' : listing.status === 'PUBLISHED' ? 'Published' : 'Draft'}
                            </span>
                          </td>
                          <td className="py-2 pr-4">
                            <span className="text-muted-foreground text-xs">
                              {listing.status === 'SOLD' && listing.soldAt ? (
                                <>
                                  Sold {new Date(listing.soldAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </>
                              ) : (
                                <>
                                  Listed {new Date(listing.createdAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </>
                              )}
                            </span>
                          </td>
                          <td className="py-2 pl-4 text-right">
                            <div className="flex justify-end gap-2">
                              {listing.status === 'SOLD' && listing.orderId ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  asChild
                                >
                                  <Link href={`/orders/${listing.orderId}`}>
                                    <Package className="mr-1 h-3 w-3" />
                                    View Order
                                  </Link>
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => beginEditListing(listing)}
                                  disabled={isSavingListing}
                                >
                                  <Pencil className="mr-1 h-3 w-3" />
                                  Edit
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stripe Dashboard</CardTitle>
            <CardDescription>
              Access your Stripe Express Dashboard to manage payouts, view transactions, and update
              account settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">From your Stripe Dashboard, you can:</p>
              <ul className="text-muted-foreground list-inside list-disc space-y-2 text-sm">
                <li>View your payout schedule and transaction history</li>
                <li>Update your bank account and tax information</li>
                <li>Manage your business profile and settings</li>
                <li>Download financial reports and tax documents</li>
              </ul>
            </div>

            <div className="pt-4">
              <Button
                onClick={handleOpenDashboard}
                size="lg"
                disabled={isOpeningDashboard}
                className="w-full sm:w-auto"
              >
                {isOpeningDashboard ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Opening Dashboard...
                  </>
                ) : (
                  <>
                    Open Stripe Dashboard
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Create listing modal */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create listing</DialogTitle>
              <DialogDescription>
                Create a single-item listing that buyers can purchase directly. You can publish it
                once you&apos;re ready.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Input
                placeholder="Display title (e.g., Charizard holo – NM)"
                value={newListingTitle}
                onChange={(e) => setNewListingTitle(e.target.value)}
              />
              <Input
                placeholder="Price (USD)"
                type="number"
                min="0"
                step="0.01"
                value={newListingPrice}
                onChange={(e) => setNewListingPrice(e.target.value)}
              />
              <textarea
                placeholder="Optional notes (condition details, etc.)"
                value={newListingNotes}
                onChange={(e) => setNewListingNotes(e.target.value)}
                className="border-input focus-visible:ring-ring bg-background placeholder:text-muted-foreground flex min-h-20 w-full rounded-md border px-3 py-2 text-sm shadow-sm outline-none"
              />
              <Input
                placeholder="Image URL (optional)"
                value={newListingImageUrl}
                onChange={(e) => setNewListingImageUrl(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetNewListingForm();
                  setIsCreateDialogOpen(false);
                }}
                disabled={isSavingListing}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateListing} disabled={isSavingListing}>
                {isSavingListing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create listing'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit listing modal */}
        <Dialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) {
              setEditingListing(null);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit listing</DialogTitle>
              <DialogDescription>
                Update the details and visibility of this listing.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Input
                placeholder="Display title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
              <Input
                placeholder="Price (USD)"
                type="number"
                min="0"
                step="0.01"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
              />
              <textarea
                placeholder="Notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="border-input focus-visible:ring-ring bg-background placeholder:text-muted-foreground flex min-h-20 w-full rounded-md border px-3 py-2 text-sm shadow-sm outline-none"
              />
              <Input
                placeholder="Image URL"
                value={editImageUrl}
                onChange={(e) => setEditImageUrl(e.target.value)}
              />
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">Status</span>
                <select
                  className="border-input bg-background flex h-9 items-center rounded-md border px-3 text-sm shadow-sm outline-none"
                  value={editStatus}
                  onChange={(e) =>
                    setEditStatus(e.target.value === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT')
                  }
                >
                  <option value="PUBLISHED">Published (visible to buyers)</option>
                  <option value="DRAFT">Draft (not visible to buyers)</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingListing(null);
                }}
                disabled={isSavingListing}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={isSavingListing || !editingListing}>
                {isSavingListing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save changes'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AccountLayout>
  );
}

export default function SellerDashboardPage() {
  return (
    <Suspense
      fallback={
        <AccountLayout>
          <div className="space-y-6">
            <div className="mb-6">
              <h1 className="mb-2 text-3xl font-bold">Seller Dashboard</h1>
              <p className="text-muted-foreground">Manage your seller account and payments</p>
            </div>
            <Card>
              <CardContent className="flex min-h-[400px] items-center justify-center">
                <div className="text-center">
                  <Loader2 className="text-muted-foreground mx-auto mb-4 h-8 w-8 animate-spin" />
                  <p className="text-muted-foreground">Loading seller dashboard...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </AccountLayout>
      }
    >
      <SellerDashboardContent />
    </Suspense>
  );
}
