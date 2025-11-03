import { auth0 } from '@/lib/auth0';
import type { NextRequest } from 'next/server';

// In v4, the middleware handles auth routes
// This route handler just needs to delegate to the middleware
export async function GET(request: NextRequest) {
  const response = await auth0.middleware(request);
  
  // The middleware should return a proper response for auth routes
  // If it returns something that looks like NextResponse.next(), 
  // we need to handle it differently
  return response;
}

export async function POST(request: NextRequest) {
  const response = await auth0.middleware(request);
  return response;
}
