import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname, '../../'),
  // The shared package ships TypeScript source (leave rules used by both the API and these screens).
  transpilePackages: ['@hr-platform/shared'],
};

export default nextConfig;

