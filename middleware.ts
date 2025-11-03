import type { NextRequest } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  
  // Let the auth0 middleware handle auth routes
  // If it's an auth route, the middleware will handle it
  // Otherwise, we can pass through
  const response = await auth0.middleware(request);
  
  // If middleware returns NextResponse.next(), convert it to continue
  // But for auth routes, it should return a proper response
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
