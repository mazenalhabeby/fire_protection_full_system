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
  // WalletConnect domains
  'https://*.walletconnect.com',
  'https://*.walletconnect.org',
  'wss://*.walletconnect.com',
  'wss://*.walletconnect.org',
  'https://*.reown.com',
  'wss://*.reown.com',
  'https://rpc.walletconnect.com',
  'https://rpc.walletconnect.org',
  'https://explorer-api.walletconnect.com',
  'https://pulse.walletconnect.org',
  'https://api.web3modal.org',
  // Blockchain RPC endpoints
  'https://*.coinbase.com',
  'https://bsc-dataseed1.binance.org',
  'https://bsc-dataseed2.binance.org',
  'https://eth.llamarpc.com',
  'https://mainnet.base.org',
  'https://polygon-rpc.com',
  'https://*.infura.io',
  'https://*.alchemy.com',
].join(' ');

const nextConfig: NextConfig = {
  output: 'standalone',

  // Image optimization configuration
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
            value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()'
          },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Note: unsafe-inline/unsafe-eval needed for Next.js and WalletConnect
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://verify.walletconnect.com https://verify.walletconnect.org",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data: https:",
              `connect-src ${connectSrcDomains}`,
              "frame-src 'self' https://verify.walletconnect.com https://verify.walletconnect.org https://secure.walletconnect.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; ')
          },
        ],
      },
    ];
  },

  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
};

export default withNextIntl(nextConfig);
