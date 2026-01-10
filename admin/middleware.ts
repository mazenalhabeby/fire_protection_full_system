import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/request';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
});

export const config = {
  // Exclude: /api, /_next, and files with extensions (.css, .js, .svg, etc.)
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
