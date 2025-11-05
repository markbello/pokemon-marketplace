import { auth0 } from '@/lib/auth0';
import { redirect } from 'next/navigation';
import { AccountLayout } from '@/components/account/AccountLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function PaymentMethodsPage() {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    redirect('/api/auth/login');
  }

  return (
    <AccountLayout>
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Payment Methods</h1>
        <p className="text-muted-foreground">Manage your saved payment methods</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
          <CardDescription>Saved payment methods coming soon</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This page will allow you to view and manage your saved payment methods from Stripe.
          </p>
        </CardContent>
      </Card>
    </AccountLayout>
  );
}

