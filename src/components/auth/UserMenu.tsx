'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function UserMenu() {
  const { user, isLoading } = useUser();
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  // Track when we've completed the initial auth check to prevent flash
  // Only update state when loading completes (isLoading transitions from true to false)
  useEffect(() => {
    if (!isLoading && !hasCheckedAuth) {
      // Use requestAnimationFrame to defer state update (non-blocking)
      // This ensures user state is fully settled before rendering
      const rafId = requestAnimationFrame(() => {
        setHasCheckedAuth(true);
      });
      return () => cancelAnimationFrame(rafId);
    }
  }, [isLoading, hasCheckedAuth]);

  // Show loading skeleton until auth state is confirmed
  if (isLoading || !hasCheckedAuth) {
    return <div className="bg-muted h-10 w-10 animate-pulse rounded-full" />;
  }

  // If no user, show sign in button only
  if (!user) {
    return (
      <Button asChild>
        <Link href="/api/auth/login">Sign In</Link>
      </Button>
    );
  }

  // Use displayName from user_metadata if available, otherwise fall back to name
  const displayName = user.user_metadata?.displayName || user.nickname || user.name;

  const userInitials =
    displayName
      ?.split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) ||
    user.email?.[0].toUpperCase() ||
    'U';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="border-border focus:ring-ring relative flex h-10 w-10 items-center justify-center rounded-full border focus:ring-2 focus:ring-offset-2 focus:outline-none">
          <Avatar>
            <AvatarImage src={user.picture || undefined} alt={displayName || 'User'} />
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm leading-none font-medium">{displayName || 'User'}</p>
            {user.email && user.email !== displayName && (
              <p className="text-muted-foreground text-xs leading-none">{user.email}</p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">Profile</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/api/auth/logout" className="text-destructive focus:text-destructive">
            Sign Out
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
