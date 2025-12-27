# Internationalization (i18n) Guide

This project uses `next-intl` for internationalization, following Next.js App Router best practices.

## Supported Languages

- **English (en)** - Default
- **Spanish (es)**
- **French (fr)**

## Project Structure

```
├── app/
│   └── [locale]/          # All pages under locale routing
│       ├── layout.tsx     # Locale-specific layout
│       └── page.tsx       # Home page with translations
├── i18n/
│   ├── request.ts         # i18n configuration
│   ├── navigation.ts      # Type-safe navigation helpers
│   ├── types.ts           # TypeScript type definitions
│   └── README.md          # This file
├── messages/
│   ├── en.json           # English translations
│   ├── es.json           # Spanish translations
│   └── fr.json           # French translations
├── components/
│   └── language-switcher.tsx  # Language switcher component
└── middleware.ts          # Language detection & routing
```

## Adding New Translations

### 1. Add translation keys to JSON files

Edit `messages/en.json`:
```json
{
  "myFeature": {
    "title": "My Feature Title",
    "description": "This is a description"
  }
}
```

Repeat for `es.json` and `fr.json` with translated content.

### 2. Use translations in components

**Server Components:**
```tsx
import { useTranslations } from 'next-intl';

export default function MyComponent() {
  const t = useTranslations('myFeature');

  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('description')}</p>
    </div>
  );
}
```

**Client Components:**
```tsx
'use client';

import { useTranslations } from 'next-intl';

export function MyClientComponent() {
  const t = useTranslations('myFeature');

  return <h1>{t('title')}</h1>;
}
```

## Advanced Features

### Rich Text Formatting

Use `t.rich()` for translations with embedded components:

```tsx
{t.rich('description', {
  link: (chunks) => <a href="/path">{chunks}</a>,
  bold: (chunks) => <strong>{chunks}</strong>
})}
```

Translation file:
```json
{
  "description": "Click {link} to continue or read {bold}"
}
```

### Variables in Translations

```tsx
{t('welcome', { name: 'John' })}
```

Translation file:
```json
{
  "welcome": "Welcome, {name}!"
}
```

### Type-Safe Navigation

Use the navigation helpers from `@/i18n/navigation`:

```tsx
import { Link, useRouter, usePathname } from '@/i18n/navigation';

// Link component (automatically includes locale)
<Link href="/about">About</Link>

// Programmatic navigation
const router = useRouter();
router.push('/dashboard');

// Get pathname without locale
const pathname = usePathname();
```

## Adding a New Language

1. **Add locale to configuration:**
   Edit `i18n/request.ts`:
   ```ts
   export const locales = ['en', 'es', 'fr', 'de'] as const;
   ```

2. **Create translation file:**
   Create `messages/de.json` with all translation keys

3. **Update middleware:**
   Edit `middleware.ts` matcher:
   ```ts
   matcher: ['/', '/(en|es|fr|de)/:path*']
   ```

4. **Update language switcher:**
   Edit `components/language-switcher.tsx`:
   ```ts
   const languageNames: Record<Locale, string> = {
     en: 'English',
     es: 'Español',
     fr: 'Français',
     de: 'Deutsch',
   };
   ```

## URL Structure

All routes are prefixed with the locale:
- `/en/` - English
- `/es/` - Spanish
- `/fr/` - French

Visiting `/` redirects to the default locale (`/en/`)

## Best Practices

1. **Always use translation keys** - Never hardcode text
2. **Keep keys organized** - Group related translations
3. **Use namespaces** - Separate translations by feature/page
4. **Maintain consistency** - Keep the same structure across all language files
5. **Type safety** - TypeScript will autocomplete translation keys
6. **Server components first** - Use server components when possible for better performance

## Testing

Run the development server and test different locales:
```bash
npm run dev
```

Visit:
- http://localhost:3000/en
- http://localhost:3000/es
- http://localhost:3000/fr

## Resources

- [next-intl Documentation](https://next-intl-docs.vercel.app/)
- [Next.js i18n Routing](https://nextjs.org/docs/app/building-your-application/routing/internationalization)
