import { VehicleForm } from '@/components/vehicles/vehicle-form';
import Image from 'next/image';
import { getPlaceholderImage } from '@/lib/placeholder-images';

interface PageProps {
  params: { [key: string]: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

// This is a Server Component. It can directly access searchParams.
export default function RegisterVehiclePage({ searchParams }: PageProps) {
  const backgroundImage = getPlaceholderImage('login-background');
  const editId = typeof searchParams.edit === 'string' ? searchParams.edit : null;
  const currentYear = new Date().getFullYear();

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
      
      {/* VehicleForm is a Client Component, but it receives server-calculated props */}
      <VehicleForm currentYear={currentYear} editId={editId} />
    </div>
  );
}
