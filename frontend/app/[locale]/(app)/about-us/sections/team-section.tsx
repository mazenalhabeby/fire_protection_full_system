import { useTranslations } from 'next-intl';

export function TeamSection() {
  const t = useTranslations('aboutUs.team');

  return (
    <section className="py-8">
      <h2 className="text-2xl font-bold text-foreground mb-4">{t('title')}</h2>
      <p className="text-muted-foreground">
        {t('description')}
      </p>
    </section>
  );
}
