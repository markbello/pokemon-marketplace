'use client';

export default function LogoutButton() {
  return (
    // eslint-disable-next-line @next/next/no-html-link-for-pages
    <a href="/api/auth/logout" className="button logout">
      Log Out
    </a>
  );
}
