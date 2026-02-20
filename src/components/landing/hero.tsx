
import { Button } from "@/components/ui/button";
import { ArrowRight, ShoppingCart, FileCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getPlaceholderImage } from '@/lib/placeholder-images';

export function HeroSection() {
    const heroImage = getPlaceholderImage("hero-image");

    return (
        <section className="relative w-full h-[75vh] md:h-[90vh] overflow-hidden">
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
                 <div className="max-w-5xl p-8 rounded-2xl backdrop-blur-[2px]">
                    <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-accent to-yellow-400 text-transparent bg-clip-text sm:text-6xl md:text-7xl lg:text-8xl font-headline shadow-text drop-shadow-2xl pb-4">
                        MecaniScan Pro
                    </h1>
                    <p className="mt-6 max-w-3xl mx-auto text-xl text-white md:text-2xl font-semibold shadow-text leading-relaxed">
                        Diagnóstico inteligente, gestión de talleres y marketplace automotriz. La solución definitiva para el cuidado de tu vehículo.
                    </p>
                    <div className="mt-12 flex flex-wrap justify-center gap-6">
                        <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 h-16 px-10 text-xl font-bold shadow-2xl transition-all hover:scale-105">
                            <Link href="#workshops">
                                Buscar Talleres <ArrowRight className="ml-2 h-6 w-6" />
                            </Link>
                        </Button>
                        <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 h-16 px-10 text-xl font-bold shadow-2xl transition-all hover:scale-105">
                            <Link href="/marketplace">
                                Marketplace <ShoppingCart className="ml-2 h-6 w-6" />
                            </Link>
                        </Button>
                        <Button asChild size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 h-16 px-10 text-xl font-bold shadow-2xl backdrop-blur-md bg-white/5 transition-all hover:scale-105">
                             <Link href="/verify">
                                <FileCheck className="mr-2 h-6 w-6" /> Validar Certificado
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
}
