'use client';
import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { VehicleForm } from '@/components/vehicles/vehicle-form';

// A component that shows a loading spinner
function Loading() {
    return (
        <div className="relative flex min-h-screen w-full items-center justify-center bg-background p-4">
            <div className="absolute inset-0 z-10 bg-black/70 backdrop-blur-sm" />
            <div className="z-20">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        </div>
    );
}

export default function RegisterVehiclePage() {
    return (
        <Suspense fallback={<Loading />}>
            <VehicleForm />
        </Suspense>
    );
}
