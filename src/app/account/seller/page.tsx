'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0';
import { useRouter, useSearchParams } from 'next/navigation';
import { AccountLayout } from '@/components/account/AccountLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, Clock, ExternalLink, Store, AlertCircle } from 'lucide-react';
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

export default function SellerDashboardPage() {
  const { user, isLoading: userLoading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<SellerStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingOnboarding, setIsStartingOnboarding] = useState(false);
  const [isOpeningDashboard, setIsOpeningDashboard] = useState(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userLoading]);

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
            <h1 className="text-3xl font-bold mb-2">Seller Dashboard</h1>
            <p className="text-muted-foreground">Manage your seller account and payments</p>
          </div>
          {/* Reserve space for content card to prevent layout shift */}
          <Card>
            <CardContent className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
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
          <AlertDescription>
            Please log in to access the seller dashboard.
          </AlertDescription>
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
            <h1 className="text-3xl font-bold mb-2">Seller Dashboard</h1>
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
                <h3 className="font-semibold">What you'll need:</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
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

              <p className="text-sm text-muted-foreground">
                You'll be redirected to Stripe to complete the secure onboarding process. This
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
            <h1 className="text-3xl font-bold mb-2">Seller Dashboard</h1>
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
                <Button
                  onClick={handleRefreshStatus}
                  variant="outline"
                  disabled={isLoading}
                >
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
                  You cannot list items or receive payments until your account is fully verified.
                  If you need to complete or update your information, click "Open Stripe Dashboard"
                  above.
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
            <h1 className="text-3xl font-bold mb-2">Seller Dashboard</h1>
            <p className="text-muted-foreground">Manage your seller account and payments</p>
          </div>
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Verified Seller</span>
          </div>
        </div>

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
              <p className="text-sm text-muted-foreground">
                From your Stripe Dashboard, you can:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
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
      </div>
    </AccountLayout>
  );
}

