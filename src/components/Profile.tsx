'use client';

import { useUser } from '@auth0/nextjs-auth0';
import Image from 'next/image';

export default function Profile() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="loading-state">
        <div className="loading-text">Loading user profile...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="profile-card action-card">
      {user.picture && (
        <Image
          src={user.picture}
          alt={user.name || 'User profile'}
          className="profile-picture"
          width={64}
          height={64}
        />
      )}
      <h2 className="profile-name">{user.name}</h2>
      <p className="profile-email">{user.email}</p>
    </div>
  );
}
