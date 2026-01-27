import TagSection from '@/components/home/TagSection';
import PopularCards from '@/components/home/PopularCards';
import PopularCollectors from '@/components/home/PopularCollectors';
import PartnerWithUs from '@/components/home/PartnerWithUs';
import { FEATURE_FLAGS, getEnabledFeatureFlags } from '@/lib/feature-flags';
import HomePageClient from './HomePageClient';

export const dynamic = 'force-dynamic';

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: HomePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const enabledFlags = getEnabledFeatureFlags(resolvedSearchParams);
  const showTagSection = enabledFlags.has(FEATURE_FLAGS.TAG_ON_LANDING_PAGE);

  const browseContent = (
    <>
      <PopularCards />
      {showTagSection && <TagSection />}
      <PopularCollectors />
      <PartnerWithUs />
    </>
  );

  return <HomePageClient browseContent={browseContent} />;
}
