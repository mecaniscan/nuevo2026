import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { PlaceHolderImages } from '@/lib/placeholder-images';

export function HeroSection() {
    const heroImage = PlaceHolderImages.find(p => p.id === "hero-image");

    return (
        <section className="relative w-full h-[60vh] md:h-[80vh] overflow-hidden">
            {heroImage && (
                 <Image
                    src={heroImage.imageUrl}
                    alt={heroImage.description}
                    fill
                    className="object-cover"
                    priority
                    data-ai-hint={heroImage.imageHint}
                />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
            <div className="relative z-10 flex flex-col items-center justify-center h-full text-center text-foreground px-4">
                 <div className="bg-black/30 backdrop-blur-sm p-8 rounded-xl border border-white/10">
                    <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl md:text-6xl lg:text-7xl font-headline">
                        El Mejor Amigo de tu Auto
                    </h1>
                    <p className="mt-4 max-w-2xl text-lg text-foreground/80 md:text-xl">
                        Decodifica al instante las luces de check engine y conéctate con mecánicos locales de confianza.
                    </p>
                    <div className="mt-8 flex flex-wrap justify-center gap-4">
                        <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                            <Link href="#workshops">
                                Encontrar un Taller <ArrowRight className="ml-2 h-5 w-5" />
                            </Link>
                        </Button>
                        <Button asChild size="lg" variant="outline" className="bg-background/50 border-white/20 hover:bg-background/80">
                             <Link href="/register">
                                Crear cuenta
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
}
