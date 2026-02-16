import { VehicleForm } from '@/components/vehicles/vehicle-form';
import Image from 'next/image';
import { getPlaceholderImage } from '@/lib/placeholder-images';

// Define the type for page props as expected by Next.js App Router.
// searchParams is always present, even if empty.
type PageProps = {
  params: { [key: string]: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export default function RegisterVehiclePage({ searchParams }: PageProps) {
  // Access searchParams directly. It's guaranteed to be an object.
  const editId = searchParams?.edit ? String(searchParams.edit) : null;
  const backgroundImage = getPlaceholderImage('login-background');
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

      <VehicleForm editId={editId} currentYear={currentYear} />
    </div>
  );
}
