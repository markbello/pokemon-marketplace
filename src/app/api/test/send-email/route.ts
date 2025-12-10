import { NextResponse } from 'next/server';

import { sendTestEmail } from '@/lib/send-email';

export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Test email endpoint is disabled in production' },
      { status: 403 },
    );
  }

  let email: string | undefined;

  try {
    const body = (await request.json()) as { email?: string };
    email = body.email;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!email) {
    return NextResponse.json({ error: 'email is required' }, { status: 400 });
  }

  const result = await sendTestEmail(email);

  return NextResponse.json(result, {
    status: result.success ? 200 : 500,
  });
}
