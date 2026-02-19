
import { Button } from "@/components/ui/button";
import { ArrowRight, ShoppingCart, FileCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getPlaceholderImage } from '@/lib/placeholder-images';

export function HeroSection() {
    const heroImage = getPlaceholderImage("hero-image");

    return (
        <section className="relative w-full h-[70vh] md:h-[85vh] overflow-hidden">
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
                 <div className="p-8 rounded-xl max-w-4xl">
                    <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-red-600 via-orange-500 to-yellow-400 text-transparent bg-clip-text sm:text-6xl md:text-7xl lg:text-8xl font-headline shadow-text">
                        El Mejor Amigo de tu Auto
                    </h1>
                    <p className="mt-6 max-w-2xl mx-auto text-lg text-foreground/90 md:text-xl font-medium shadow-text">
                        Registra tu taller para ofrecer servicios o registra tu auto para solicitar y agendar servicios en nuestra red de talleres, como también puedes publicar tu vehículo para la venta en nuestra tienda de Marketplace.
                    </p>
                    <div className="mt-10 flex flex-wrap justify-center gap-4">
                        <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 h-14 px-8 text-lg font-bold shadow-lg">
                            <Link href="#workshops">
                                Encontrar un Taller <ArrowRight className="ml-2 h-5 w-5" />
                            </Link>
                        </Button>
                        <Button asChild size="lg" className="bg-gradient-to-r from-red-600 to-orange-500 hover:opacity-90 h-14 px-8 text-lg font-bold shadow-lg text-white">
                            <Link href="/marketplace">
                                Marketplace <ShoppingCart className="ml-2 h-5 w-5" />
                            </Link>
                        </Button>
                        <Button asChild size="lg" variant="outline" className="border-yellow-400 text-yellow-400 hover:bg-yellow-400/10 h-14 px-8 text-lg font-bold shadow-lg bg-background/50 backdrop-blur-sm">
                             <Link href="/verify">
                                <FileCheck className="mr-2 h-5 w-5" /> Validar Certificado
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
}
