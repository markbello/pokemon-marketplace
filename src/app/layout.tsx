import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Auth0Provider } from '@auth0/nextjs-auth0';
import Navbar from '@/components/layout/Navbar';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'kado.io',
  description: 'Buy and sell trading cards with ease',
  icons: {
    icon: '/kado-logo-D7tb47J6.png',
    apple: '/kado-logo-D7tb47J6.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <Auth0Provider>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
          </div>
          <Toaster />
        </Auth0Provider>
      </body>
    </html>
  );
}
