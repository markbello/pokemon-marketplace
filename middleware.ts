import type { NextRequest } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { NextResponse } from 'next/server';
import { isProfileComplete, shouldBypassProfileCheck } from '@/lib/auth-utils';

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;

  // Let the auth0 middleware handle auth routes first
  const response = await auth0.middleware(request);

  // Check if this route should bypass profile completeness check
  if (shouldBypassProfileCheck(url.pathname)) {
    return response;
  }

  // Check if user is authenticated and profile is complete
  // Only check after auth routes have been handled
  try {
    // Get session from the request (Auth0 middleware sets up cookies)
    const session = await auth0.getSession(request);

    // If user is authenticated but profile is incomplete, redirect to onboarding
    if (session?.user && !isProfileComplete(session.user)) {
      // Only redirect if not already on onboarding page
      if (url.pathname !== '/onboarding') {
        const onboardingUrl = new URL('/onboarding', url.origin);
        // Preserve the original destination so we can redirect back after onboarding
        onboardingUrl.searchParams.set('returnTo', url.pathname);
        return NextResponse.redirect(onboardingUrl);
      }
    }
  } catch (error) {
    // If there's an error checking the session, continue normally
    // This prevents blocking the app if there's an Auth0 issue
    console.error('Error checking profile completeness:', error);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
