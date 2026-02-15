import { VehicleForm } from '@/components/vehicles/vehicle-form';
import Image from 'next/image';
import { getPlaceholderImage } from '@/lib/placeholder-images';

type RegisterVehiclePageProps = {
    params: {}; // This is part of the page props contract, even if unused.
    searchParams: { [key: string]: string | string[] | undefined };
};

export default function RegisterVehiclePage({ searchParams }: RegisterVehiclePageProps) {
    const editId = typeof searchParams?.edit === 'string' ? searchParams.edit : null;
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
           <VehicleForm editId={editId} />
        </div>
    );
}
