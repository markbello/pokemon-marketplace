/**
 * PM-65: Admin page to view invitation codes
 */

'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
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
import { Loader2, AlertCircle, CheckCircle2, Clock, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface InvitationCode {
  id: string;
  code: string;
  createdBy: string | null;
  usedBy: string | null;
  usedAt: string | null;
  createdAt: string;
}

interface InvitationCodesData {
  codes: InvitationCode[];
  summary: {
    total: number;
    used: number;
    unused: number;
  };
}

export default function AdminInvitationCodesPage() {
  const { user, isLoading: userLoading } = useUser();
  const router = useRouter();
  const [data, setData] = useState<InvitationCodesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check admin status and fetch codes
  useEffect(() => {
    const fetchData = async () => {
      if (userLoading) return;

      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/admin/invitation-codes');

        if (response.status === 403) {
          setIsAdmin(false);
          setIsLoading(false);
          return;
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to load invitation codes');
        }

        const responseData = await response.json();
        setData(responseData);
        setIsAdmin(true);
      } catch (error) {
        console.error('Error fetching invitation codes:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load data';
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, userLoading]);

  if (userLoading || isLoading) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <Loader2 className="text-muted-foreground mx-auto mb-4 h-8 w-8 animate-spin" />
            <p className="text-muted-foreground">Loading invitation codes...</p>
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
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/admin')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Admin
          </Button>
        </div>

        <div>
          <h1 className="mb-2 text-3xl font-bold">Invitation Codes</h1>
          <p className="text-muted-foreground">
            Manage invitation codes for controlled launch (PM-65)
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Codes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.summary.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Used</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{data?.summary.used || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Available</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{data?.summary.unused || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Codes Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Invitation Codes</CardTitle>
                <CardDescription>
                  View all generated invitation codes and their status
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!data || data.codes.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center">
                <p>No invitation codes found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead>Used By</TableHead>
                      <TableHead>Used At</TableHead>
                      <TableHead>Created At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.codes.map((code) => (
                      <TableRow key={code.id}>
                        <TableCell className="font-mono font-medium">{code.code}</TableCell>
                        <TableCell>
                          {code.usedBy ? (
                            <Badge className="bg-green-600">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Used
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <Clock className="mr-1 h-3 w-3" />
                              Available
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {code.createdBy || 'N/A'}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {code.usedBy ? `${code.usedBy.slice(0, 20)}...` : '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {code.usedAt
                            ? new Date(code.usedAt).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(code.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
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
