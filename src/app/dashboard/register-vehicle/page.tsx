'use client';

import { VehicleForm } from '@/components/vehicles/vehicle-form';
import Image from 'next/image';
import { getPlaceholderImage } from '@/lib/placeholder-images';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// This component's only job is to get the search param and pass it down.
// It's rendered inside Suspense.
function VehicleFormWrapper() {
    const searchParams = useSearchParams();
    const editId = searchParams.get('edit');
    return <VehicleForm editId={editId} />
}

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
                <Loader2 className="h-12 w-12 animate-spin text-primary z-20" />
           }>
                <VehicleFormWrapper />
           </Suspense>
        </div>
    );
}
