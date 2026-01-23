'use client';

import { Share2, Pencil, Plus, Users, Heart } from 'lucide-react';
import { UserAvatar } from '@/components/avatar/UserAvatar';
import { Button } from '@/components/ui/button';
import { TogglePill } from '@/components/ui/toggle-pill';

interface CollectionHeaderProps {
  user: {
    id: string;
    slug: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    bio?: string | null;
  };
  stats: {
    following: number;
    followers: number;
  };
  isOwner: boolean;
  activeTab: 'my-collection' | 'friends-collection';
  onTabChange: (tab: 'my-collection' | 'friends-collection') => void;
  onAddCard?: () => void;
}

export function CollectionHeader({
  user,
  stats,
  isOwner,
  activeTab,
  onTabChange,
  onAddCard,
}: CollectionHeaderProps) {
  return (
    <div className="relative mb-8">
      {/* Gradient banner */}
      <div className="relative h-32 overflow-hidden rounded-2xl bg-gradient-to-r from-violet-500 via-purple-500 to-pink-400">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute left-1/4 top-1/4 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
          <div className="absolute right-1/4 bottom-1/4 h-24 w-24 rounded-full bg-pink-300/30 blur-xl" />
        </div>
        
        {/* Banner text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
          <h1 className="text-2xl font-bold tracking-tight">
            {isOwner ? 'Welcome to my Pokemon Card World!' : `Welcome to ${user.displayName || 'this'} Pokemon Card World!`}
          </h1>
          <p className="mt-1 text-sm opacity-90">
            Browse graded Pokemon cards with real-time market values. Find PSA, BGS, and CGC graded cards.
          </p>
        </div>

        {/* Edit icon for owner */}
        {isOwner && (
          <button 
            className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white transition hover:bg-white/30"
            aria-label="Edit banner"
          >
            <Pencil className="size-4" />
          </button>
        )}
      </div>

      {/* User info section */}
      <div className="relative px-4">
        {/* Avatar - overlapping the banner */}
        <div className="absolute -top-12 left-6">
          <div className="rounded-full border-4 border-white bg-white">
            <UserAvatar
              avatarUrl={user.avatarUrl}
              name={user.displayName}
              size="large"
              className="h-24 w-24"
            />
          </div>
        </div>

        {/* User details and actions */}
        <div className="flex items-start justify-between pt-14">
          <div className="space-y-1">
            <h2 className="text-xl font-bold">{user.displayName || 'Collector'}</h2>
            {user.bio && (
              <p className="text-sm text-muted-foreground">{user.bio}</p>
            )}
            
            {/* Stats */}
            <div className="flex items-center gap-4 pt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Users className="size-4" />
                <span className="font-medium text-foreground">{stats.following}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Heart className="size-4" />
                <span className="font-medium text-foreground">{stats.followers}</span>
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="text-sm">
              <Share2 className="size-3.5" />
              Share
            </Button>
            {isOwner && (
              <Button variant="outline" size="sm" className="text-sm">
                <Pencil className="size-3.5" />
                Edit
              </Button>
            )}
          </div>
        </div>

        {/* Toggle and Add Card button */}
        <div className="mt-6 flex items-center justify-between">
          {isOwner ? (
            <TogglePill
              options={['My Collection', 'Friends Collection'] as const}
              value={activeTab === 'my-collection' ? 'My Collection' : 'Friends Collection'}
              onChange={(val) => onTabChange(val === 'My Collection' ? 'my-collection' : 'friends-collection')}
            />
          ) : (
            <span className="text-lg font-semibold">Collection</span>
          )}

          {isOwner && (
            <Button 
              onClick={onAddCard}
              size="sm"
              className="bg-violet-500 text-sm hover:bg-violet-600"
            >
              <Plus className="size-3.5" />
              List a Card
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
