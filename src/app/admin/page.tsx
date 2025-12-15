'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, ExternalLink, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface SellerAccount {
  id: string;
  displayName: string | null;
  stripeAccountId: string;
  createdAt: string;
  updatedAt: string;
  verificationStatus: {
    accountId: string;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
    isVerified: boolean;
  } | null;
}

export default function AdminPage() {
  const { user, isLoading: userLoading } = useUser();
  const router = useRouter();
  const [sellers, setSellers] = useState<SellerAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check admin status and fetch sellers
  useEffect(() => {
    const fetchData = async () => {
      if (userLoading) return;

      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch sellers (this will also check admin status server-side)
        const response = await fetch('/api/admin/sellers');

        if (response.status === 403) {
          setIsAdmin(false);
          setIsLoading(false);
          return;
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to load seller accounts');
        }

        const data = await response.json();
        setSellers(data.sellers || []);
        setIsAdmin(true);
      } catch (error) {
        console.error('Error fetching admin data:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load data';
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, userLoading]);

  const getStripeDashboardUrl = async (accountId: string) => {
    try {
      // For admin, we'd need a separate endpoint or use Stripe API directly
      // For now, construct the Stripe dashboard URL
      const stripeAccountId = accountId;
      return `https://dashboard.stripe.com/connect/accounts/${stripeAccountId}`;
    } catch (error) {
      console.error('Error getting Stripe dashboard URL:', error);
      return null;
    }
  };

  const handleOpenStripeDashboard = async (accountId: string) => {
    const url = await getStripeDashboardUrl(accountId);
    if (url) {
      window.open(url, '_blank');
    } else {
      toast.error('Failed to open Stripe dashboard');
    }
  };

  if (userLoading || isLoading) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <Loader2 className="text-muted-foreground mx-auto mb-4 h-8 w-8 animate-spin" />
            <p className="text-muted-foreground">Loading admin dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Please log in to access the admin dashboard.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="flex min-h-[60vh] items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="bg-muted mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                <AlertCircle className="text-muted-foreground h-8 w-8" />
              </div>
              <CardTitle className="text-2xl">Access Denied</CardTitle>
              <CardDescription className="mt-2">
                You don&apos;t have permission to access this page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="pt-4">
                <Button variant="outline" className="w-full" onClick={() => router.push('/')}>
                  Go to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="space-y-6">
        <div>
          <h1 className="mb-2 text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage seller accounts and verification status</p>
        </div>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
            <CardDescription>Navigate to admin sections</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => router.push('/admin/invitation-codes')}>
                Invitation Codes
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Seller Accounts</CardTitle>
                <CardDescription>
                  View all seller accounts and their verification status
                </CardDescription>
              </div>
              <Badge variant="outline">
                {sellers.length} seller{sellers.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {sellers.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center">
                <p>No seller accounts found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Display Name</TableHead>
                      <TableHead>Account ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Verification</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sellers.map((seller) => {
                      const status = seller.verificationStatus;
                      const isVerified = status?.isVerified ?? false;
                      const detailsSubmitted = status?.detailsSubmitted ?? false;

                      return (
                        <TableRow key={seller.id}>
                          <TableCell className="font-medium">
                            {seller.displayName || 'N/A'}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {seller.stripeAccountId.slice(0, 20)}...
                          </TableCell>
                          <TableCell>
                            {isVerified ? (
                              <Badge className="bg-green-600">
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                Verified
                              </Badge>
                            ) : detailsSubmitted ? (
                              <Badge
                                variant="outline"
                                className="border-yellow-500 text-yellow-600"
                              >
                                <Clock className="mr-1 h-3 w-3" />
                                Pending
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                <Clock className="mr-1 h-3 w-3" />
                                Incomplete
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 text-sm">
                              <div>
                                Charges:{' '}
                                <span
                                  className={
                                    status?.chargesEnabled ? 'text-green-600' : 'text-yellow-600'
                                  }
                                >
                                  {status?.chargesEnabled ? 'Yes' : 'No'}
                                </span>
                              </div>
                              <div>
                                Payouts:{' '}
                                <span
                                  className={
                                    status?.payoutsEnabled ? 'text-green-600' : 'text-yellow-600'
                                  }
                                >
                                  {status?.payoutsEnabled ? 'Yes' : 'No'}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{new Date(seller.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenStripeDashboard(seller.stripeAccountId)}
                            >
                              <ExternalLink className="mr-2 h-3 w-3" />
                              Stripe
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
