import Image from 'next/image';
import { getPlaceholderImage } from '@/lib/placeholder-images';
import React, { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { VehicleForm } from '@/components/vehicles/vehicle-form';

/**
 * RegisterVehiclePage is a Server Component.
 * It renders the background layout and wraps the Client Form in Suspense
 * to handle Next.js 15 static generation requirements for useSearchParams.
 */
export default function RegisterVehiclePage() {
  const backgroundImage = getPlaceholderImage('login-background');
  
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-background p-4">
      {backgroundImage && (
        <Image
          src={backgroundImage.imageUrl}
          alt={backgroundImage.description}
          fill
          className="absolute inset-0 z-0 object-cover"
          priority
          data-ai-hint={backgroundImage.imageHint}
        />
      )}
      <div className="absolute inset-0 z-10 bg-black/70 backdrop-blur-sm" />
      
      <Card className="z-20 w-full max-w-2xl shadow-2xl bg-black/30 border-white/20 text-white">
        <CardHeader>
            <CardTitle className="text-3xl font-headline text-primary flex items-center justify-between">
                Gestionar Vehículo
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/dashboard/my-vehicles"><ArrowLeft className="mr-2"/> Volver</Link>
                </Button>
            </CardTitle>
            <CardDescription className="text-white/80">
                Añade o edita los detalles de tu vehículo en tu garaje digital.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Suspense fallback={
                <div className="flex h-[50vh] items-center justify-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            }>
                <VehicleForm />
            </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
