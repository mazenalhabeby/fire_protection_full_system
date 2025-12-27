# Page Sections Organization Guide

This guide explains how pages and their sections are organized in this project.

## Structure Overview

Each page has its own folder containing:
- `page.tsx` - The main page component
- `sections/` - Folder with all section components for that page

```
app/[locale]/
├── page.tsx                 # Home page
├── sections/                # Home page sections
│   ├── header-section.tsx
│   ├── hero-section.tsx
│   ├── cta-section.tsx
│   └── index.ts
├── about-us/                # About page route
│   ├── page.tsx
│   └── sections/            # About page sections
│       ├── hero-section.tsx
│       ├── team-section.tsx
│       └── index.ts
└── contact/                 # Contact page route
    ├── page.tsx
    └── sections/            # Contact page sections
        ├── form-section.tsx
        └── index.ts
```

## Why This Structure?

✅ **Co-location** - Page and its sections are together
✅ **Clear organization** - Easy to find sections for each page
✅ **Scalability** - Add new pages without affecting others
✅ **Maintainability** - Each page is self-contained
✅ **Team-friendly** - Multiple developers can work on different pages

## Creating a New Page with Sections

### Step 1: Create the page folder and structure

```bash
mkdir -p app/[locale]/services/sections
```

### Step 2: Create section components

Create individual section files in the `sections/` folder:

```tsx
// app/[locale]/services/sections/hero-section.tsx
import { useTranslations } from 'next-intl';

export function HeroSection() {
  const t = useTranslations('services.hero');

  return (
    <section className="py-16">
      <h1 className="text-4xl font-bold">{t('title')}</h1>
      <p className="mt-4">{t('description')}</p>
    </section>
  );
}
```

```tsx
// app/[locale]/services/sections/features-section.tsx
import { useTranslations } from 'next-intl';

export function FeaturesSection() {
  const t = useTranslations('services.features');

  return (
    <section className="py-16">
      <h2 className="text-3xl font-semibold">{t('title')}</h2>
      {/* Features content */}
    </section>
  );
}
```

### Step 3: Create barrel export file

```ts
// app/[locale]/services/sections/index.ts
export { HeroSection } from './hero-section';
export { FeaturesSection } from './features-section';
```

### Step 4: Create the page component

```tsx
// app/[locale]/services/page.tsx
import { HeroSection, FeaturesSection } from './sections';

export default function ServicesPage() {
  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4">
        <HeroSection />
        <FeaturesSection />
      </main>
    </div>
  );
}
```

### Step 5: Add translations

```json
// messages/en.json
{
  "services": {
    "hero": {
      "title": "Our Services",
      "description": "Professional fire protection services"
    },
    "features": {
      "title": "What We Offer"
    }
  }
}
```

## Section Naming Convention

Follow these naming patterns:

- `hero-section.tsx` - Main hero/banner section
- `features-section.tsx` - Features showcase
- `pricing-section.tsx` - Pricing information
- `testimonials-section.tsx` - Customer testimonials
- `cta-section.tsx` - Call-to-action section
- `faq-section.tsx` - Frequently asked questions
- `team-section.tsx` - Team members
- `contact-section.tsx` - Contact form
- `gallery-section.tsx` - Image gallery

## Translation Organization

Match your translation keys to the page and section structure:

```json
{
  "home": {
    "hero": { ... },
    "cta": { ... }
  },
  "aboutUs": {
    "hero": { ... },
    "team": { ... }
  },
  "services": {
    "hero": { ... },
    "features": { ... }
  }
}
```

In components:
```tsx
const t = useTranslations('aboutUs.hero');
```

## Complete Example: Creating "Contact" Page

**1. Create structure:**
```bash
mkdir -p app/[locale]/contact/sections
```

**2. Create sections:**

```tsx
// app/[locale]/contact/sections/hero-section.tsx
import { useTranslations } from 'next-intl';

export function HeroSection() {
  const t = useTranslations('contact.hero');
  return (
    <section>
      <h1>{t('title')}</h1>
      <p>{t('subtitle')}</p>
    </section>
  );
}
```

```tsx
// app/[locale]/contact/sections/form-section.tsx
'use client';

import { useTranslations } from 'next-intl';

export function FormSection() {
  const t = useTranslations('contact.form');
  return (
    <section>
      <h2>{t('title')}</h2>
      <form>{/* Form fields */}</form>
    </section>
  );
}
```

```tsx
// app/[locale]/contact/sections/info-section.tsx
import { useTranslations } from 'next-intl';

export function InfoSection() {
  const t = useTranslations('contact.info');
  return (
    <section>
      <h2>{t('title')}</h2>
      <p>{t('email')}</p>
      <p>{t('phone')}</p>
    </section>
  );
}
```

**3. Create index.ts:**
```ts
// app/[locale]/contact/sections/index.ts
export { HeroSection } from './hero-section';
export { FormSection } from './form-section';
export { InfoSection } from './info-section';
```

**4. Create page.tsx:**
```tsx
// app/[locale]/contact/page.tsx
import { HeroSection, FormSection, InfoSection } from './sections';

export default function ContactPage() {
  return (
    <div className="min-h-screen">
      <main>
        <HeroSection />
        <FormSection />
        <InfoSection />
      </main>
    </div>
  );
}
```

**5. Add translations (all languages):**
```json
// messages/en.json
{
  "contact": {
    "hero": {
      "title": "Contact Us",
      "subtitle": "We'd love to hear from you"
    },
    "form": {
      "title": "Send us a message"
    },
    "info": {
      "title": "Contact Information",
      "email": "Email: info@company.com",
      "phone": "Phone: +1 234 567 8900"
    }
  }
}
```

## Best Practices

### 1. Keep Sections Focused
Each section should have a single responsibility:
- ✅ `hero-section.tsx` - Only hero content
- ❌ `hero-and-features-section.tsx` - Too much in one

### 2. Use Semantic HTML
```tsx
export function HeroSection() {
  return (
    <section className="...">  {/* Use <section>, not <div> */}
      <h1>...</h1>
    </section>
  );
}
```

### 3. Always Create index.ts
This makes imports clean:
```tsx
// Good ✅
import { HeroSection, TeamSection } from './sections';

// Bad ❌
import { HeroSection } from './sections/hero-section';
import { TeamSection } from './sections/team-section';
```

### 4. Client vs Server Components
Mark client components explicitly:
```tsx
'use client';  // Only when needed (forms, interactions, etc.)

import { useTranslations } from 'next-intl';
```

### 5. Consistent Styling
Use Tailwind classes consistently:
```tsx
<section className="py-16">  {/* Consistent padding */}
  <div className="container mx-auto px-4">  {/* Consistent container */}
    {/* Content */}
  </div>
</section>
```

## Quick Reference

### File Structure Template
```
app/[locale]/[page-name]/
├── page.tsx
└── sections/
    ├── section-1.tsx
    ├── section-2.tsx
    └── index.ts
```

### Section Component Template
```tsx
import { useTranslations } from 'next-intl';

export function SectionName() {
  const t = useTranslations('pageName.sectionName');

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <h2>{t('title')}</h2>
        {/* Section content */}
      </div>
    </section>
  );
}
```

### index.ts Template
```ts
export { Section1 } from './section-1';
export { Section2 } from './section-2';
```

### page.tsx Template
```tsx
import { Section1, Section2 } from './sections';

export default function PageName() {
  return (
    <div className="min-h-screen">
      <main>
        <Section1 />
        <Section2 />
      </main>
    </div>
  );
}
```

## Troubleshooting

**Q: Import errors when using './sections'?**
A: Make sure you have `sections/index.ts` with proper exports.

**Q: Translations not working?**
A: Check that translation keys match: `useTranslations('pageName.sectionName')`

**Q: Section not showing?**
A: Verify the section is imported and rendered in `page.tsx`

## Summary

This structure keeps your codebase:
- **Organized** - Clear separation of concerns
- **Scalable** - Easy to add new pages and sections
- **Maintainable** - Easy to find and update code
- **Collaborative** - Multiple developers can work efficiently

Happy coding! 🚀
