'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ShoppingBag, User, Settings, Store } from 'lucide-react';

interface AccountLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  {
    name: 'Profile',
    href: '/account/profile',
    icon: User,
  },
  {
    name: 'Purchases',
    href: '/account/purchases',
    icon: ShoppingBag,
  },
  {
    name: 'Seller Dashboard',
    href: '/account/seller',
    icon: Store,
  },
  {
    name: 'Preferences',
    href: '/account/preferences',
    icon: Settings,
  },
];

export function AccountLayout({ children }: AccountLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="container max-w-7xl px-4 py-8">
      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Sidebar - fixed width to prevent shifting */}
        <aside className="w-full lg:w-64 lg:max-w-[256px] lg:min-w-[256px] lg:shrink-0">
          <nav className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main content - flex-1 to take remaining space */}
        <main className="min-w-0 flex-1 lg:max-w-[calc(100%-256px-2rem)]">{children}</main>
      </div>
    </div>
  );
}
