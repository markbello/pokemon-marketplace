'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { RuntimeEnvironment } from '@/lib/env';

type EnvironmentContextType = {
  environment: RuntimeEnvironment;
  stripePublishableKey: string;
};

const EnvironmentContext = createContext<EnvironmentContextType | undefined>(undefined);

type EnvironmentProviderProps = {
  children: ReactNode;
  environment: RuntimeEnvironment;
  stripePublishableKey: string;
};

/**
 * Provider that makes environment information available to client components.
 * The environment is detected server-side and passed down to avoid client-side detection issues.
 */
export function EnvironmentProvider({
  children,
  environment,
  stripePublishableKey,
}: EnvironmentProviderProps) {
  return (
    <EnvironmentContext.Provider value={{ environment, stripePublishableKey }}>
      {children}
    </EnvironmentContext.Provider>
  );
}

/**
 * Hook to access environment information in client components.
 * Must be used within an EnvironmentProvider.
 */
export function useEnvironment(): EnvironmentContextType {
  const context = useContext(EnvironmentContext);
  if (context === undefined) {
    throw new Error('useEnvironment must be used within an EnvironmentProvider');
  }
  return context;
}
