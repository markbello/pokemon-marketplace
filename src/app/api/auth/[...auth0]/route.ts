import { getAuth0Client } from '@/lib/auth0';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// In v4, the middleware handles auth routes
// This route handler just needs to delegate to the middleware
export async function GET(request: NextRequest) {
  // Check if this is an RSC prefetch request (Next.js tries to prefetch links)
  // RSC requests have specific headers that indicate prefetching
  // The _rsc query parameter also indicates RSC requests
  const isRSCPrefetch =
    request.headers.get('next-router-prefetch') === '1' ||
    request.headers.get('x-nextjs-data') !== null ||
    request.nextUrl.searchParams.has('_rsc');

  // If it's a prefetch request, return a response that prevents prefetching
  // Auth routes should not be prefetched since they redirect to external Auth0
  // Returning a 204 No Content tells Next.js not to prefetch this route
  if (isRSCPrefetch) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  }

  // Get Auth0 client with dynamic config based on request headers
  const auth0 = await getAuth0Client();
  const response = await auth0.middleware(request);

  // The middleware should return a proper response for auth routes
  // If it returns something that looks like NextResponse.next(),
  // we need to handle it differently
  return response;
}

export async function POST(request: NextRequest) {
  // Get Auth0 client with dynamic config based on request headers
  const auth0 = await getAuth0Client();
  const response = await auth0.middleware(request);
  return response;
}
