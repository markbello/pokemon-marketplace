export const FEATURE_FLAGS = {
  TAG_ON_LANDING_PAGE: 'TAG_ON_LANDING_PAGE',
} as const;

export type FeatureFlag = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];

type SearchParams = Record<string, string | string[] | undefined>;

export function getEnabledFeatureFlags(searchParams?: SearchParams): Set<FeatureFlag> {
  if (!searchParams) {
    return new Set();
  }

  const raw = searchParams.toggleOn;

  if (!raw) {
    return new Set();
  }

  const values = Array.isArray(raw) ? raw : [raw];
  const flags = values
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean);

  return new Set(flags as FeatureFlag[]);
}
