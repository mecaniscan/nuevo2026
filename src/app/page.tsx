import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { HeroSection } from '@/components/landing/hero';
import { OBDII_Decoder } from '@/components/decoder/obdii-decoder';
import { WorkshopFinder } from '@/components/workshops/workshop-finder';

export default function Home() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <OBDII_Decoder />
        <WorkshopFinder />
      </main>
      <Footer />
    </div>
  );
}
