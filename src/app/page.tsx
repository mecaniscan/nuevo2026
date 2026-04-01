import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { HeroSection } from '@/components/landing/hero';
import { WorkshopFinder } from '@/components/workshops/workshop-finder';

export default function Home() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background selection:bg-primary selection:text-primary-foreground">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <WorkshopFinder />
      </main>
      <Footer />
    </div>
  );
}