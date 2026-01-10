import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/request';

export default createMiddleware({
  // A list of all locales that are supported
  locales,

  // Used when no locale matches
  defaultLocale,

  // Always use locale prefix in the URL
  localePrefix: 'always'
});

export const config = {
  // Exclude: /api, /_next, and files with extensions (.css, .js, .svg, etc.)
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
