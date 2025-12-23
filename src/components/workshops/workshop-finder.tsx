"use client";

import { useState } from 'react';
import { workshops } from '@/lib/data';
import { WorkshopCard } from './workshop-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Search } from 'lucide-react';

export function WorkshopFinder() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showObdOnly, setShowObdOnly] = useState(false);

  const filteredWorkshops = workshops
    .filter(ws => ws.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(ws => (showObdOnly ? ws.hasObdiiScanner : true));

  return (
    <section id="workshops" className="w-full py-12 md:py-24 lg:py-32 bg-card/50">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <div className="inline-block rounded-lg bg-secondary px-3 py-1 text-sm">Localizador de Talleres</div>
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline text-primary">Encuentra un Mecánico de Confianza Cerca de Ti</h2>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredWorkshops.map(workshop => (
                   <WorkshopCard key={workshop.id} workshop={workshop} />
                ))}
            </div>
            {filteredWorkshops.length === 0 && (
                <div className="text-center text-muted-foreground mt-12 col-span-full">
                    <p>No se encontraron talleres que coincidan con tus criterios.</p>
                </div>
            )}
        </div>
      </div>
    </section>
  );
}
