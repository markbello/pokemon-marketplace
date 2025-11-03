import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    // Allow images from the public directory
    unoptimized: false,
  },
};

export default nextConfig;
