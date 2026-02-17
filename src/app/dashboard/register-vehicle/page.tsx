import { VehicleForm } from '@/components/vehicles/vehicle-form';
import Image from 'next/image';
import { getPlaceholderImage } from '@/lib/placeholder-images';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// This is a Server Component that sets up the layout and Suspense boundary.
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
      
      <Suspense fallback={
        <div className="z-20 flex h-64 w-full max-w-2xl items-center justify-center rounded-lg bg-black/30">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      }>
        {/* VehicleForm is a Client Component that will use hooks like useSearchParams */}
        <VehicleForm />
      </Suspense>
    </div>
  );
}
