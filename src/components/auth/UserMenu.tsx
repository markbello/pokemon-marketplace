'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserAvatar } from '@/components/avatar/UserAvatar';
import Link from 'next/link';
import { User, ShoppingBag, Settings, LogOut, Store, Shield } from 'lucide-react';

export default function UserMenu() {
  const { user, isLoading } = useUser();
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const [freshUserData, setFreshUserData] = useState<typeof user | null>(null);
  const [hasLoadedFreshData, setHasLoadedFreshData] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

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

  // Fetch fresh user data from Management API to get latest user_metadata (including avatar)
  // This ensures we get the most up-to-date avatar even if the session hasn't refreshed
  useEffect(() => {
    if (user?.sub) {
      const fetchFreshData = async () => {
        try {
          // Add a cache-busting parameter to ensure we get fresh data
          const response = await fetch(`/api/user/me?t=${Date.now()}`);
          if (response.ok) {
            const data = await response.json();
            setFreshUserData(data.user);
          }
        } catch (error) {
          // Silently fail - fall back to session user data
          console.error('Failed to fetch fresh user data:', error);
        } finally {
          setHasLoadedFreshData(true);
        }
      };

      const checkAdminStatus = async () => {
        try {
          const response = await fetch('/api/admin/check');
          if (response.ok) {
            const data = await response.json();
            setIsAdmin(data.isAdmin || false);
          }
        } catch (error) {
          // Silently fail - assume not admin
          console.error('Failed to check admin status:', error);
          setIsAdmin(false);
        }
      };

      fetchFreshData();
      checkAdminStatus();

      // Refetch on window focus (happens after router.refresh() and page navigation)
      const handleFocus = () => {
        fetchFreshData();
        checkAdminStatus();
      };
      window.addEventListener('focus', handleFocus);

      return () => {
        window.removeEventListener('focus', handleFocus);
      };
    }
  }, [user?.sub]);

  // Show loading skeleton until auth state is confirmed
  if (isLoading || !hasCheckedAuth) {
    return <div className="bg-muted h-12 w-12 animate-pulse rounded-full" />;
  }

  // If no user, show login / sign up link
  if (!user) {
    return (
      <Link
        href="/api/auth/login"
        className="text-sm font-medium text-muted-foreground hover:text-foreground transition"
        prefetch={false}
      >
        Login / Sign up
      </Link>
    );
  }

  // Show skeleton while loading fresh data to check for avatar
  if (!hasLoadedFreshData) {
    return <div className="bg-muted border-border h-12 w-12 rounded-full border" />;
  }

  // Use fresh user data if available (from Management API), otherwise fall back to session user
  // This ensures we get the latest avatar data even if the session hasn't refreshed
  const displayUser = freshUserData || user;

  // Use displayName from user_metadata if available, otherwise fall back to name
  const displayName =
    displayUser?.user_metadata?.displayName || displayUser?.nickname || displayUser?.name;

  // Get avatar data from user_metadata
  const avatarData = displayUser?.user_metadata?.avatar;
  const avatarPublicId = avatarData?.public_id;
  const avatarUrl = avatarData?.secure_url;

  // Only show initials if we've confirmed there's no avatar
  const hasAvatar = avatarPublicId || avatarUrl;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="border-border focus:ring-ring relative flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border transition-opacity hover:opacity-80 focus:ring-2 focus:ring-offset-2 focus:outline-none">
          <UserAvatar
            publicId={avatarPublicId}
            avatarUrl={avatarUrl || displayUser?.picture || undefined}
            name={hasAvatar ? undefined : displayName || undefined}
            size="small"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm leading-none font-medium">{displayName || 'User'}</p>
            {displayUser?.email && displayUser.email !== displayName && (
              <p className="text-muted-foreground text-xs leading-none">{displayUser.email}</p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account/profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/purchases" className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            Purchases
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/seller" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            Seller Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/preferences" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Preferences
          </Link>
        </DropdownMenuItem>
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Admin Dashboard
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            href="/api/auth/logout"
            prefetch={false}
            className="text-destructive focus:text-destructive flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
