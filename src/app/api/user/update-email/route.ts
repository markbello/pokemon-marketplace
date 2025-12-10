import { NextResponse } from 'next/server';

import { auth0 } from '@/lib/auth0';
import {
  getOrCreateUser,
  getPreferredEmail,
  updateUserEmail,
  updateUserPreferredEmail,
} from '@/lib/user';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let email: string | undefined;
  try {
    const body = (await request.json()) as { email?: string };
    email = body.email?.trim();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!email || !emailRegex.test(email)) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
  }

  try {
    let updatedPrimary = false;
    try {
      await updateUserEmail(session.user.sub, email);
      updatedPrimary = true;
    } catch (err) {
      const e = err as { errorCode?: string };
      if (e?.errorCode && e.errorCode !== 'operation_not_supported') {
        throw err;
      }
    }

    await updateUserPreferredEmail(session.user.sub, email);
    const updatedUser = await getOrCreateUser(session.user.sub);
    const preferred = getPreferredEmail(updatedUser, email);

    return NextResponse.json({ success: true, email: preferred, updatedPrimary });
  } catch (error) {
    console.error('[UpdateEmail] Error updating email:', error);
    return NextResponse.json({ error: 'Failed to update email' }, { status: 500 });
  }
}
