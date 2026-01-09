import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

// Environment-based configuration
const isDev = process.env.NODE_ENV === 'development';
const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

// Build CSP connect-src based on environment
const connectSrcDomains = [
  "'self'",
  // Only include localhost in development
  ...(isDev ? ['http://localhost:3001'] : []),
  // Include configured API URL domain
  ...(apiUrl ? [apiUrl.replace(/\/api\/?$/, '')] : []),
].join(' ');

const nextConfig: NextConfig = {
  output: 'standalone',

  // Image optimization for admin avatars and uploads
  images: {
    remotePatterns: [
      // Development: allow localhost
      ...(isDev ? [{
        protocol: 'http' as const,
        hostname: 'localhost',
        port: '3001',
        pathname: '/uploads/**',
      }] : []),
      // Production: allow production domain
      {
        protocol: 'https' as const,
        hostname: '*.hbctoken.com',
        pathname: '/uploads/**',
      },
    ],
  },

  // Security headers configuration
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Prevent clickjacking attacks
          { key: 'X-Frame-Options', value: 'DENY' },
          // Prevent MIME type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Control referrer information
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Enable browser XSS filter
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // DNS prefetch control
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          // Permissions policy (control sensitive features)
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
          },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data: https:",
              `connect-src ${connectSrcDomains}`,
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; ')
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
