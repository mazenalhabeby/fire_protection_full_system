import { HeroSection, TeamSection } from './sections';

export default function AboutUsPage() {
  return (
    <div className="flex-1 bg-background">
      <main className="container mx-auto px-4 py-16 max-w-7xl">
        <HeroSection />
        <TeamSection />
      </main>
    </div>
  );
}
