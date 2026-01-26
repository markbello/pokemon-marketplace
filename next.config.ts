import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    // Disable Vercel image optimization globally - we use Cloudinary/CloudFront CDNs
    // which already provide optimization, caching, and format conversion.
    // This avoids Vercel billing limits and double-processing latency.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'd1htnxwo4o0jhw.cloudfront.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
