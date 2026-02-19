"use client";

import { useState, useMemo, useEffect } from 'react';
import { WorkshopCard } from './workshop-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Search, Loader2 } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { Workshop, Service } from '@/lib/types';
import React from 'react';

export function WorkshopFinder() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showObdOnly, setShowObdOnly] = useState(false);
  const firestore = useFirestore();

  const workshopsCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'workshops');
  }, [firestore]);

  const workshopsQuery = useMemoFirebase(() => {
    if (!workshopsCollection) return null;
    if (showObdOnly) {
      return query(workshopsCollection, where('obdScannerService', '==', true));
    }
    return query(workshopsCollection);
  }, [workshopsCollection, showObdOnly]);

  const { data: workshops, isLoading: isWorkshopsLoading } = useCollection<Workshop>(workshopsQuery);
  const [allServices, setAllServices] = useState<Map<string, Service[]>>(new Map());
  const [areServicesLoading, setAreServicesLoading] = useState(false);
  
  useEffect(() => {
    let isMounted = true;

    async function fetchAllServices() {
        if (!workshops || workshops.length === 0 || !firestore) {
            if (isMounted) setAreServicesLoading(false);
            return;
        };

        if (isMounted) setAreServicesLoading(true);
        const servicesMap = new Map<string, Service[]>();
        
        try {
            const servicePromises = workshops.map(async (workshop) => {
                const servicesColRef = collection(firestore, `workshops/${workshop.id}/services`);
                const servicesSnapshot = await getDocs(servicesColRef);
                const services = servicesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Service));
                return { id: workshop.id, services };
            });

            const results = await Promise.all(servicePromises);
            
            if (isMounted) {
                results.forEach(res => servicesMap.set(res.id, res.services));
                setAllServices(servicesMap);
            }
        } catch (error) {
            if (isMounted) {
                 errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: 'workshops/*/services',
                    operation: 'list'
                }));
            }
        } finally {
            if (isMounted) setAreServicesLoading(false);
        }
    }

    fetchAllServices();

    return () => {
        isMounted = false;
    };
  }, [workshops, firestore]);


  const filteredWorkshops = useMemo(() => {
    if (!workshops) return [];
    
    const enrichedWorkshops = workshops.map((workshop) => {
      const workshopServices = allServices.get(workshop.id) || [];
      return {
        ...workshop,
        services: workshopServices,
      };
    });

    return enrichedWorkshops.filter(ws => ws.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [workshops, allServices, searchTerm]);

  const isLoading = isWorkshopsLoading || areServicesLoading;

  return (
    <section id="workshops" className="w-full py-12 md:py-24 lg:py-32 bg-card/50">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <div className="inline-block rounded-lg bg-secondary px-3 py-1 text-sm">Localizador de Talleres</div>
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline text-slate-300">Encuentra un Mecánico de Confianza Cerca de Ti</h2>
            <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Explora nuestra red de talleres registrados. Filtra por servicios para encontrar la opción perfecta para las necesidades de tu auto.
            </p>
          </div>
        </div>
        <div className="mx-auto max-w-6xl mt-12">
            <div className="flex flex-col sm:flex-row gap-4 mb-8 p-4 border rounded-lg bg-card sticky top-20 z-10 backdrop-blur-md shadow-lg">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input id="search" placeholder="Buscar por nombre, ej., Precision Auto" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
                <div className="flex items-center justify-center sm:justify-end">
                    <div className="flex items-center space-x-2">
                        <Switch id="obd-filter" checked={showObdOnly} onCheckedChange={setShowObdOnly} />
                        <Label htmlFor="obd-filter" className="text-nowrap">Solo con Escáner OBD-II</Label>
                    </div>
                </div>
            </div>

            {isLoading && (
              <div className="flex justify-center items-center col-span-full h-64">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
            )}
            
            {!isLoading && filteredWorkshops && filteredWorkshops.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredWorkshops.map(workshop => (
                    <WorkshopCard key={workshop.id} workshop={workshop as any} />
                  ))}
              </div>
            ) : !isLoading && (
                <div className="text-center text-muted-foreground mt-12 col-span-full h-64 flex flex-col justify-center items-center">
                    <p className="text-lg">No se encontraron talleres.</p>
                    <p className="text-sm">Prueba con otro término de búsqueda o ajusta los filtros.</p>
                </div>
            )}
        </div>
      </div>
    </section>
  );
}
