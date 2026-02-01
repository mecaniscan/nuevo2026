import Image from 'next/image';
import type { Workshop, Service } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, ScanLine, Star, Car } from 'lucide-react';
import Link from 'next/link';

type WorkshopCardProps = {
  workshop: Workshop & { services: Service[] };
};

export function WorkshopCard({ workshop }: WorkshopCardProps) {
  return (
    <Card className="flex flex-col h-full overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-1 animate-in fade-in-50 zoom-in-95">
      <CardHeader className="p-0">
        <div className="relative h-48 w-full bg-muted flex items-center justify-center">
            {workshop.imageUrl ? (
                <Image
                    src={workshop.imageUrl}
                    alt={workshop.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
            ) : (
                <Car className="h-20 w-20 text-muted-foreground"/>
            )}
            {workshop.obdScannerService && (
                <Badge variant="default" className="absolute top-2 right-2 bg-accent text-accent-foreground border-transparent shadow-md">
                    <ScanLine className="mr-1.5 h-4 w-4" /> Escáner OBD-II
                </Badge>
            )}
        </div>
      </CardHeader>
      <div className="p-6 flex-grow flex flex-col">
        <h3 className="text-xl font-semibold leading-none tracking-tight mb-2">{workshop.name}</h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <MapPin className="h-4 w-4 shrink-0" /> <span>{workshop.address}</span>
        </div>
        <div className="flex items-center gap-1.5 mb-4">
            <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
            <span className="font-bold text-foreground">{(workshop.averageRating || 0).toFixed(1)}</span>
            <span className="text-sm text-muted-foreground">({(workshop.reviewCount || 0)} reseñas)</span>
        </div>
        <div className="flex flex-wrap gap-2 mt-auto">
            {workshop.services.slice(0, 3).map(service => (
                <Badge key={service.id} variant="secondary">{service.name}</Badge>
            ))}
            {workshop.services.length > 3 && (
                <Badge variant="outline">+{workshop.services.length-3} más</Badge>
            )}
        </div>
      </div>
      <CardFooter>
        <Button className="w-full" asChild>
            <Link href={`/workshop/${workshop.id}`}>
                Ver Taller y Agendar
            </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
