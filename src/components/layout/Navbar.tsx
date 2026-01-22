'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import UserMenu from '@/components/auth/UserMenu';
import { cn } from '@/lib/utils';

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="flex h-20 w-full items-center justify-between px-6">
        <div className="flex items-center gap-10">
          <Link href="/" className="flex items-center">
            <Image
              src="/kado-logo-D7tb47J6.png"
              alt="kado.io"
              width={44}
              height={44}
              className="h-11 w-11"
              unoptimized
              priority
            />
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/"
              className={cn(
                'hover:text-foreground text-sm font-medium transition-colors',
                pathname === '/' ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              Browse
            </Link>
            <Link
              href="/collection"
              className={cn(
                'hover:text-foreground text-sm font-medium transition-colors',
                pathname?.startsWith('/collection')
                  ? 'text-foreground'
                  : 'text-muted-foreground',
              )}
            >
              Collection
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-6">
          <Link
            href="/account/seller"
            className="bg-foreground text-background hover:bg-foreground/90 rounded-full px-5 py-2 text-sm font-medium transition"
          >
            + Sell a card
          </Link>
          <UserMenu />
        </div>
      </div>
    </nav>
  );
}
