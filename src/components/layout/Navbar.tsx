'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import UserMenu from '@/components/auth/UserMenu';
import { cn } from '@/lib/utils';

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="flex h-20 w-full items-center justify-between px-4">
        <Link href="/" className="flex items-center">
          <Image
            src="/kado-logo.jpg"
            alt="kado.io"
            width={200}
            height={60}
            className="h-14 w-auto"
            priority
          />
        </Link>

        <div className="flex items-center gap-6">
          <nav className="flex items-center gap-6">
            <Link
              href="/"
              className={cn(
                'hover:text-primary text-sm font-medium transition-colors',
                pathname === '/' ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              Browse
            </Link>
            <Link
              href="/account/seller"
              className={cn(
                'hover:text-primary text-sm font-medium transition-colors',
                pathname?.startsWith('/account/seller')
                  ? 'text-foreground'
                  : 'text-muted-foreground',
              )}
            >
              Sell
            </Link>
          </nav>

          <UserMenu />
        </div>
      </div>
    </nav>
  );
}
