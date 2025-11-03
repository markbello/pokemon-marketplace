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
    // In middleware, we need to pass the request to getSession
    const session = await auth0.getSession(request);

    if (session?.user) {
      // Use the isProfileComplete utility which handles all cases
      // Only redirect if profile is explicitly incomplete AND not already on onboarding
      // This prevents redirect loops and allows access when metadata hasn't refreshed yet
      if (!isProfileComplete(session.user) && url.pathname !== '/onboarding') {
        // Only redirect if we have user_metadata (meaning user has started onboarding)
        // If no user_metadata exists, the session might not be refreshed yet, so be permissive
        const userMetadata = session.user.user_metadata;
        
        // Only enforce redirect if user_metadata exists and profileComplete is explicitly false
        // This prevents redirecting users whose session hasn't refreshed with new metadata
        if (userMetadata && userMetadata.profileComplete === false) {
          const onboardingUrl = new URL('/onboarding', url.origin);
          onboardingUrl.searchParams.set('returnTo', url.pathname);
          return NextResponse.redirect(onboardingUrl);
        }
      }
    }
  } catch (error) {
    // If there's an error checking the session, continue normally
    // This prevents blocking the app if there's an Auth0 issue
    // Don't log errors in production to avoid noise
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
