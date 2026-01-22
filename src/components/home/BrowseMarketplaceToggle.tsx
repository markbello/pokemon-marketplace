'use client';

import { useState } from 'react';

const options = ['Browse', 'Marketplace'] as const;

export default function BrowseMarketplaceToggle() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="border-muted/60 bg-muted/40 relative inline-flex w-[280px] items-center rounded-full border p-1">
      <div
        className={`bg-foreground absolute inset-y-1 left-1 w-1/2 rounded-full shadow-sm transition-transform duration-300 ${
          activeIndex === 0 ? 'translate-x-0' : 'translate-x-full'
        }`}
      />
      {options.map((option, index) => (
        <button
          key={option}
          type="button"
          onClick={() => setActiveIndex(index)}
          className={`relative z-10 w-1/2 whitespace-nowrap rounded-full py-2 text-center text-sm font-medium transition ${
            activeIndex === index ? 'text-background' : 'text-muted-foreground hover:text-foreground'
          } ${index === 1 ? 'pl-4' : ''}`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
