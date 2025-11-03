'use client';

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

  if (isLoading) {
    return (
      <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
    );
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
  
  const userInitials = displayName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || user.email?.[0].toUpperCase() || 'U';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
          <Avatar>
            <AvatarImage src={user.picture || undefined} alt={displayName || 'User'} />
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName || 'User'}</p>
            {user.email && user.email !== displayName && (
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
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
