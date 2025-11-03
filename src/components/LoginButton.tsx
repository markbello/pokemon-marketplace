'use client';

export default function LoginButton() {
  return (
    // eslint-disable-next-line @next/next/no-html-link-for-pages
    <a href="/api/auth/login" className="button login">
      Log In
    </a>
  );
}
