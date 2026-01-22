import { getAuth0Client } from '@/lib/auth0';
import BrowseMarketplaceToggle from '@/components/home/BrowseMarketplaceToggle';
import HeroSection from '@/components/home/HeroSection';
import PopularCards from '@/components/home/PopularCards';
import TagSection from '@/components/home/TagSection';
import PopularCollectors from '@/components/home/PopularCollectors';
import PartnerWithUs from '@/components/home/PartnerWithUs';
import Footer from '@/components/home/Footer';
import { FEATURE_FLAGS, getEnabledFeatureFlags } from '@/lib/feature-flags';

export const dynamic = 'force-dynamic';

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: HomePageProps) {
  const auth0 = await getAuth0Client();
  const session = await auth0.getSession();
  const isAuthenticated = !!session?.user;
  const userId = session?.user?.sub;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const enabledFlags = getEnabledFeatureFlags(resolvedSearchParams);
  const showTagSection = enabledFlags.has(FEATURE_FLAGS.TAG_ON_LANDING_PAGE);

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="space-y-16">
          <HeroSection />

          <PopularCards />

          {showTagSection && (
            <TagSection />
          )}

          <PopularCollectors />
          <PartnerWithUs />
          <Footer />
        </div>
      </div>
    </div>
  );
}
