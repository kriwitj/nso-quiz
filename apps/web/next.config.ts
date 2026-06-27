import type { NextConfig } from 'next';
import path from 'path';

// BASE_PATH is baked at build time via ARG in Dockerfile (e.g. /nso-quiz).
// Leave empty for root deployment.
const basePath = process.env.BASE_PATH ?? '';

const nextConfig: NextConfig = {
  basePath,
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: 'minio' },
      { protocol: 'https', hostname: '*.googleusercontent.com' },
      { protocol: 'https', hostname: 'province-stat.nso.go.th' },
    ],
  },
  transpilePackages: ['@quiz/shared'],
};

export default nextConfig;
