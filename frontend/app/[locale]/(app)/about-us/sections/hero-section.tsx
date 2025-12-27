import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/ui/page-header';

export function HeroSection() {
  const t = useTranslations('aboutUs.hero');

  return (
    <section className="pb-8">
      <PageHeader
        title={t('title')}
        subtitle={t('description')}
        align="center"
      />
    </section>
  );
}
