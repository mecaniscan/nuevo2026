'use client';
import React, { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { Vehicle } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, MapPin, Car, Search } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

const WhatsappIcon = () => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-current"><title>WhatsApp</title><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 2.52 5.079 3.556.718.255 1.299.408 1.74.527.534.142 1.028.12 1.425.074.446-.05 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 5.451 0 9.885 4.434 9.889 9.884.002 5.45-4.433 9.884-9.889 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892.157 14.66.965 17.165 2.63 19.05l-2.63 9.95 10.193-2.685a11.815 11.815 0 005.655 1.5l.004-.001h.004c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
);


export default function MarketplacePage() {
  const firestore = useFirestore();
  const [countryFilter, setCountryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  
  const marketplaceQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'marketplace'));
  }, [firestore]);

  const { data: vehicles, isLoading } = useCollection<Vehicle>(marketplaceQuery);
  
  const filteredVehicles = useMemo(() => {
    if (!vehicles) return [];
    return vehicles.filter(vehicle => {
      const countryMatch = countryFilter ? vehicle.country.toLowerCase().includes(countryFilter.toLowerCase()) : true;
      const brandMatch = brandFilter ? vehicle.brand.toLowerCase().includes(brandFilter.toLowerCase()) : true;
      return countryMatch && brandMatch;
    });
  }, [vehicles, countryFilter, brandFilter]);

function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  
  const handleContact = () => {
    if (vehicle.sellerWhatsapp) {
      const message = `Hola, estoy interesado/a en tu ${vehicle.brand} ${vehicle.model} que vi en MecaniScan.`;
      const whatsappUrl = `https://wa.me/${vehicle.sellerWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col">
        <CardHeader className="p-0">
             <Carousel className="w-full">
                <CarouselContent>
                    {vehicle.imageUrls && vehicle.imageUrls.length > 0 ? (
                        vehicle.imageUrls.map((url, index) => (
                            <CarouselItem key={index}>
                                <div className="relative h-56 w-full">
                                    <Image src={url} alt={`${vehicle.brand} ${vehicle.model} foto ${index + 1}`} fill className="object-cover" />
                                </div>
                            </CarouselItem>
                        ))
                    ) : (
                        <CarouselItem>
                            <div className="relative h-56 w-full bg-muted flex items-center justify-center">
                                 <Car className="w-24 h-24 text-muted-foreground" />
                            </div>
                        </CarouselItem>
                    )}
                </CarouselContent>
                {vehicle.imageUrls && vehicle.imageUrls.length > 1 && (
                    <>
                        <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2" />
                        <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2" />
                    </>
                )}
            </Carousel>
        </CardHeader>
        <CardContent className="p-4 space-y-2 flex-grow">
            <CardTitle className="text-xl">{vehicle.brand} {vehicle.model}</CardTitle>
            <CardDescription>{vehicle.year} &bull; {vehicle.currentMileage.toLocaleString()} km</CardDescription>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{vehicle.country}</span>
            </div>
            <p className="text-2xl font-bold text-primary pt-2">${vehicle.price.toLocaleString('es-AR')}</p>
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-4 p-4 bg-muted/50">
            <div className='w-full'>
                <p className="text-sm font-medium text-foreground">Vendedor:</p>
                <p className="text-sm text-muted-foreground">{vehicle.sellerName || 'No disponible'}</p>
            </div>
             <div className="w-full">
                {vehicle.sellerWhatsapp ? (
                    <Button className="w-full" onClick={handleContact}>
                        <WhatsappIcon /> Contactar al Vendedor
                    </Button>
                ) : (
                     <Button className="w-full" variant="secondary" disabled>
                        Contacto no disponible
                    </Button>
                )}
            </div>
        </CardFooter>
    </Card>
  )
}

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1 py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl font-headline text-primary">Marketplace de Vehículos</h1>
            <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Explora vehículos a la venta publicados por otros usuarios. Filtra por país y marca para encontrar tu próximo auto.
            </p>
          </div>

           <div className="mx-auto max-w-6xl">
             <div className="flex flex-col sm:flex-row gap-4 mb-8 p-4 border rounded-lg bg-card sticky top-20 z-10 backdrop-blur-md shadow-lg">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                        placeholder="Filtrar por País..." 
                        value={countryFilter}
                        onChange={(e) => setCountryFilter(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                        placeholder="Filtrar por Marca..." 
                        value={brandFilter}
                        onChange={(e) => setBrandFilter(e.target.value)}
                        className="pl-10"
                    />
                </div>
                 <Button variant="outline" onClick={() => {setBrandFilter(''); setCountryFilter('');}}>Limpiar Filtros</Button>
            </div>


            {isLoading ? (
              <div className="flex justify-center items-center col-span-full h-64">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
            ) : filteredVehicles && filteredVehicles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredVehicles.map(vehicle => (
                    <VehicleCard key={vehicle.id} vehicle={vehicle} />
                  ))}
              </div>
            ) : (
                <div className="text-center text-muted-foreground mt-12 col-span-full h-64 flex flex-col justify-center items-center bg-card rounded-lg">
                    <p className="text-lg font-semibold">No se encontraron vehículos a la venta</p>
                    <p className="text-sm">No hay vehículos que coincidan con tus filtros actuales o aún no se han publicado vehículos.</p>
                </div>
            )}
        </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
