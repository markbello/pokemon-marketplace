'use client';

import { useState } from 'react';
import { TogglePill } from '@/components/ui/toggle-pill';

const options = ['Browse', 'Marketplace'] as const;
type Option = (typeof options)[number];

export default function BrowseMarketplaceToggle() {
  const [active, setActive] = useState<Option>('Browse');

  return <TogglePill options={options} value={active} onChange={setActive} />;
}
