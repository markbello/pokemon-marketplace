import { redirect } from 'next/navigation';
import { getAuth0Client } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type CollectionRedirectProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CollectionRedirect({ searchParams }: CollectionRedirectProps) {
  const auth0 = await getAuth0Client();
  const session = await auth0.getSession();

  if (!session?.user) {
    redirect('/api/auth/login?returnTo=/collection');
  }

  const userId = session.user.sub;

  // Find user and get their slug (or fall back to id)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { slug: true, id: true },
  });

  if (!user) {
    redirect('/onboarding');
  }

  // Redirect to the user's collection page using slug or id
  const identifier = user.slug || user.id;
  
  // Preserve query params (like feature flags)
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const queryString = resolvedSearchParams 
    ? new URLSearchParams(
        Object.entries(resolvedSearchParams)
          .filter(([, v]) => v !== undefined)
          .flatMap(([k, v]) => Array.isArray(v) ? v.map(val => [k, val]) : [[k, v as string]])
      ).toString()
    : '';
  
  redirect(`/collection/${identifier}${queryString ? `?${queryString}` : ''}`);
}
