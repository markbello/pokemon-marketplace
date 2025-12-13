import type { Metadata } from 'next';
import { Nunito } from 'next/font/google';
import { Auth0Provider } from '@auth0/nextjs-auth0';
import Navbar from '@/components/layout/Navbar';
import { Toaster } from '@/components/ui/sonner';
import { EnvironmentProvider } from '@/components/providers/EnvironmentProvider';
import { detectRuntimeEnvironment, getStripePublishableKey } from '@/lib/env';
import './globals.css';

const nunito = Nunito({
  variable: '--font-nunito',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'kado.io',
  description: 'Buy and sell trading cards with ease',
  icons: {
    icon: '/kado-favicon.jpg',
    apple: '/kado-favicon.jpg',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Detect environment server-side using actual host header
  const environment = await detectRuntimeEnvironment();
  const stripePublishableKey = await getStripePublishableKey();

  return (
    <html lang="en">
      <body className={`${nunito.variable} antialiased`}>
        <Auth0Provider>
          <EnvironmentProvider
            environment={environment}
            stripePublishableKey={stripePublishableKey}
          >
            <div className="flex min-h-screen flex-col">
              <Navbar />
              <main className="flex-1">{children}</main>
            </div>
            <Toaster />
          </EnvironmentProvider>
        </Auth0Provider>
      </body>
    </html>
  );
}
