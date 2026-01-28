'use client';

import { useEffect, useState, Suspense } from 'react';
import { useUser } from '@auth0/nextjs-auth0';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { AccountLayout } from '@/components/account/AccountLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AuthError } from '@/components/auth/AuthError';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { OrdersListingsTable } from '@/components/orders/OrdersListingsTable';
import {
  Loader2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Store,
  AlertCircle,
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

interface ListingCard {
  id: string;
  cardName: string | null;
  setName: string | null;
  cardNumber: string | null;
  variety: string | null;
  frontImageUrl: string | null;
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
  psaCertNumber?: string | null;
  cardId?: string | null;
  card?: ListingCard | null;
  createdAt: string;
  updatedAt: string;
  // Sale info (populated when SOLD)
  soldAt: string | null;
  orderId: string | null;
  buyerName: string | null;
  saleTotalCents: number | null;
  // Shipping info
  orderShippingCarrier: string | null;
  orderTrackingNumber: string | null;
  orderFulfillmentStatus: string | null;
}

interface LookupCard {
  id: string;
  cardName: string | null;
  setName: string | null;
  cardNumber: string | null;
  variety: string | null;
  frontImageUrl: string | null;
  backImageUrl: string | null;
  highestImageGrade: number | null;
}

interface LookupCertificate {
  id: string;
  certNumber: string;
  grade: number | null;
  gradeLabel: string | null;
  frontImageUrl: string | null;
  backImageUrl: string | null;
}

interface LookupPSAData {
  Subject?: string;
  Brand?: string;
  CardNumber?: string;
  Variety?: string;
  GradeDescription?: string;
  CardGrade?: string | number;
  CertNumber?: string | number;
  PSACert?: LookupPSAData;
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
  const [isLookingUpCert, setIsLookingUpCert] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newListingPrice, setNewListingPrice] = useState('');
  const [newListingNotes, setNewListingNotes] = useState('');
  const [newListingCertNumber, setNewListingCertNumber] = useState('');
  const [newListingSlabCondition, setNewListingSlabCondition] = useState<string>('');
  const [lookupCard, setLookupCard] = useState<LookupCard | null>(null);
  const [lookupCertificate, setLookupCertificate] = useState<LookupCertificate | null>(null);
  const [lookupPSAData, setLookupPSAData] = useState<LookupPSAData | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

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
    setNewListingPrice('');
    setNewListingNotes('');
    setNewListingCertNumber('');
    setNewListingSlabCondition('');
    setLookupCard(null);
    setLookupCertificate(null);
    setLookupPSAData(null);
    setLookupError(null);
  };

  const handleLookupCertificate = async () => {
    const certNumber = newListingCertNumber.trim();
    if (!certNumber) {
      toast.error('Please enter a PSA cert number');
      return;
    }

    try {
      setIsLookingUpCert(true);
      setLookupError(null);
      setLookupCard(null);
      setLookupCertificate(null);
      setLookupPSAData(null);

      const response = await fetch(
        `/api/certificates/psa/lookup?certNumber=${encodeURIComponent(certNumber)}`,
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to lookup PSA certificate');
      }

      const data = (await response.json()) as {
        cardId?: string | null;
        card?: LookupCard | null;
        certificateId?: string | null;
        certificate?: LookupCertificate | null;
        psaData?: LookupPSAData | null;
      };

      if (data.card && data.certificate) {
        setLookupCard(data.card);
        setLookupCertificate(data.certificate);
        setNewListingCertNumber(data.certificate.certNumber || certNumber);
      } else if (data.psaData) {
        setLookupPSAData(data.psaData);
      } else {
        throw new Error('PSA lookup did not return card details');
      }
    } catch (error) {
      console.error('Error looking up PSA certificate:', error);
      const message = error instanceof Error ? error.message : 'Failed to lookup PSA certificate';
      setLookupError(message);
      toast.error(message);
    } finally {
      setIsLookingUpCert(false);
    }
  };

  const handleCreateListing = async () => {
    if (!lookupCard && !lookupPSAData) {
      toast.error('Please search for a PSA cert first');
      return;
    }

    if (!newListingPrice) {
      toast.error('Please enter a price');
      return;
    }

    if (!newListingSlabCondition) {
      toast.error('Please select the slab condition');
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
          askingPriceCents,
          sellerNotes: newListingNotes || undefined,
          psaCertNumber: lookupCertificate?.certNumber || newListingCertNumber.trim() || undefined,
          cardId: lookupCard?.id,
          gradingCertificateId: lookupCertificate?.id,
          slabCondition: newListingSlabCondition,
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
        <AuthError
          title="Seller Dashboard"
          description="Please log in to access the seller dashboard."
          loginReturnTo="/account/seller"
        />
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
            <p className="text-muted-foreground">Start selling on kado.io</p>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Store className="h-6 w-6" />
                <div>
                  <CardTitle>Become a Seller</CardTitle>
                  <CardDescription>
                    Complete seller onboarding to start listing and selling cards
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
            <OrdersListingsTable
              items={listings.map((listing) => ({
                id: listing.id,
                displayTitle: listing.displayTitle,
                sellerNotes: listing.sellerNotes,
                askingPriceCents: listing.askingPriceCents,
                currency: listing.currency,
                status: listing.status,
                imageUrl: listing.imageUrl,
                createdAt: listing.createdAt,
                updatedAt: listing.updatedAt,
                soldAt: listing.soldAt,
                orderId: listing.orderId,
                buyerOrSellerName: listing.buyerName,
                saleTotalCents: listing.saleTotalCents,
                orderShippingCarrier: listing.orderShippingCarrier,
                orderTrackingNumber: listing.orderTrackingNumber,
                orderFulfillmentStatus: listing.orderFulfillmentStatus,
                // Card details for collection-style title display
                cardName: listing.card?.cardName || null,
                setName: listing.card?.setName || null,
                cardNumber: listing.card?.cardNumber || null,
                variety: listing.card?.variety || null,
              }))}
              mode="seller"
              onShippingSuccess={fetchListings}
            />
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
                Create a single-item listing that buyers can purchase directly. Provide a PSA cert
                number and we&apos;ll pull the card details and images automatically.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="flex gap-2">
                <Input
                  placeholder="PSA Cert Number"
                  value={newListingCertNumber}
                  onChange={(e) => {
                    setNewListingCertNumber(e.target.value);
                    setLookupCard(null);
                    setLookupCertificate(null);
                    setLookupPSAData(null);
                    setLookupError(null);
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleLookupCertificate}
                  disabled={isLookingUpCert}
                >
                  {isLookingUpCert ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    'Search PSA'
                  )}
                </Button>
              </div>
              {lookupError ? (
                <Alert variant="destructive">
                  <AlertDescription>{lookupError}</AlertDescription>
                </Alert>
              ) : null}
              {lookupCard && lookupCertificate ? (
                <div className="border-border bg-muted/20 flex gap-3 rounded-lg border p-3">
                  <div className="bg-muted relative h-28 w-20 rounded-md">
                    <Image
                      src={
                        lookupCertificate.frontImageUrl ||
                        lookupCard.frontImageUrl ||
                        '/kado-placeholder.jpg'
                      }
                      alt={lookupCard.cardName || 'Card preview'}
                      fill
                      className="object-contain"
                      sizes="80px"
                    />
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="font-medium">
                      {lookupCard.cardName || 'Unknown card'}{' '}
                      {lookupCard.variety ? `- ${lookupCard.variety}` : ''}
                    </div>
                    <div className="text-muted-foreground">
                      {lookupCard.setName || 'Unknown set'}
                      {lookupCard.cardNumber ? ` • #${lookupCard.cardNumber}` : ''}
                    </div>
                    <div className="text-muted-foreground">
                      PSA Cert {lookupCertificate.certNumber}
                      {lookupCertificate.gradeLabel
                        ? ` • ${lookupCertificate.gradeLabel}`
                        : lookupCertificate.grade !== null
                          ? ` • Grade ${lookupCertificate.grade}`
                          : ''}
                    </div>
                  </div>
                </div>
              ) : lookupPSAData ? (
                <div className="border-border bg-muted/20 space-y-2 rounded-lg border p-3 text-sm">
                  {(() => {
                    const psaCert = lookupPSAData.PSACert ?? lookupPSAData;
                    return (
                      <>
                        <div className="font-medium">
                          {psaCert.Subject || 'Unknown card'}{' '}
                          {psaCert.Variety ? `- ${psaCert.Variety}` : ''}
                        </div>
                        <div className="text-muted-foreground">
                          {psaCert.Brand || 'Unknown set'}
                          {psaCert.CardNumber ? ` • #${psaCert.CardNumber}` : ''}
                        </div>
                        <div className="text-muted-foreground">
                          PSA Cert {psaCert.CertNumber || newListingCertNumber.trim()}
                          {psaCert.GradeDescription
                            ? ` • ${psaCert.GradeDescription}`
                            : psaCert.CardGrade
                              ? ` • Grade ${psaCert.CardGrade}`
                              : ''}
                        </div>
                        <div className="text-muted-foreground">
                          Images unavailable yet. You can still continue with pricing.
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : null}
              <Input
                placeholder="Price (USD)"
                type="number"
                min="0"
                step="0.01"
                value={newListingPrice}
                onChange={(e) => setNewListingPrice(e.target.value)}
                disabled={(!lookupCard && !lookupPSAData) || isSavingListing}
              />
              <textarea
                placeholder="Optional notes (condition details, etc.)"
                value={newListingNotes}
                onChange={(e) => setNewListingNotes(e.target.value)}
                className="border-input focus-visible:ring-ring bg-background placeholder:text-muted-foreground flex min-h-20 w-full rounded-md border px-3 py-2 text-sm shadow-sm outline-none"
                disabled={(!lookupCard && !lookupPSAData) || isSavingListing}
              />
              <div className="space-y-2">
                <Label htmlFor="slab-condition">Slab Condition *</Label>
                <Select
                  value={newListingSlabCondition}
                  onValueChange={setNewListingSlabCondition}
                  disabled={(!lookupCard && !lookupPSAData) || isSavingListing}
                >
                  <SelectTrigger id="slab-condition">
                    <SelectValue placeholder="Select slab condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MINT">Mint - Perfect condition, no visible defects</SelectItem>
                    <SelectItem value="NEAR_MINT">Near Mint - Minor imperfections, light scratches</SelectItem>
                    <SelectItem value="GOOD">Good - Noticeable wear, scratches, but structurally sound</SelectItem>
                    <SelectItem value="DAMAGED">Damaged - Significant cracks, chips, or structural issues</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
              <Button
                onClick={handleCreateListing}
                disabled={isSavingListing || (!lookupCard && !lookupPSAData)}
              >
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
