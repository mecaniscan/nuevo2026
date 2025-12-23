'use client';
import React, { useState, useMemo } from 'react';
import { useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { Vehicle } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MapPin } from 'lucide-react';
import Image from 'next/image';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import Link from 'next/link';
import { PlaceHolderImages } from '@/lib/placeholder-images';

function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  const vehicleImage = vehicle.imageUrls?.[0] || (PlaceHolderImages.find(p => p.id === 'workshop-5')?.imageUrl ?? 'https://picsum.photos/seed/car/600/400');
  const vehicleImageHint = vehicle.imageUrls?.[0] ? "vehicle image" : "classic car";
  
  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
        <CardHeader className="p-0">
             <div className="relative h-56 w-full">
                <Image
                    src={vehicleImage}
                    alt={`${vehicle.brand} ${vehicle.model}`}
                    fill
                    className="object-cover"
                    data-ai-hint={vehicleImageHint}
                />
            </div>
        </CardHeader>
        <CardContent className="p-4 space-y-2">
            <CardTitle className="text-xl">{vehicle.brand} {vehicle.model}</CardTitle>
            <CardDescription>{vehicle.year} &bull; {vehicle.currentMileage.toLocaleString()} km</CardDescription>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{vehicle.country}</span>
            </div>
            <p className="text-2xl font-bold text-primary pt-2">${vehicle.price.toLocaleString('es-AR')}</p>
        </CardContent>
        <CardFooter>
            {/* The link could lead to a detailed vehicle page in the future */}
            <Button className="w-full" asChild>
                <Link href="#">Ver Detalles</Link> 
            </Button>
        </CardFooter>
    </Card>
  )
}

export default function MarketplacePage() {
  const firestore = useFirestore();
  const [countryFilter, setCountryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  
  const marketplaceCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'marketplace');
  }, [firestore]);

  const { data: vehicles, isLoading } = useCollection<Vehicle>(marketplaceCollection);

  const uniqueCountries = useMemo(() => {
    if (!vehicles) return [];
    return [...new Set(vehicles.map(v => v.country).filter(Boolean))];
  }, [vehicles]);
  
  const uniqueBrands = useMemo(() => {
    if (!vehicles) return [];
    return [...new Set(vehicles.map(v => v.brand).filter(Boolean))];
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    if (!vehicles) return [];
    return vehicles.filter(vehicle => {
      const countryMatch = countryFilter ? vehicle.country === countryFilter : true;
      const brandMatch = brandFilter ? vehicle.brand === brandFilter : true;
      return countryMatch && brandMatch;
    });
  }, [vehicles, countryFilter, brandFilter]);

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
                {(vehicles && vehicles.length > 0) && (
                    <>
                        <div className="flex-1">
                            <Select value={countryFilter} onValueChange={setCountryFilter}>
                                <SelectTrigger><SelectValue placeholder="Filtrar por País" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">Todos los Países</SelectItem>
                                    {uniqueCountries.map(country => <SelectItem key={country} value={country}>{country}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex-1">
                            <Select value={brandFilter} onValueChange={setBrandFilter}>
                                <SelectTrigger><SelectValue placeholder="Filtrar por Marca" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">Todas las Marcas</SelectItem>
                                    {uniqueBrands.map(brand => <SelectItem key={brand} value={brand}>{brand}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </>
                )}
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
