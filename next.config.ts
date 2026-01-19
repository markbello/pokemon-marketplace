import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    // Allow images from the public directory
    unoptimized: false,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'd1htnxwo4o0jhw.cloudfront.net',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
