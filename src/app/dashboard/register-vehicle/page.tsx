import { VehicleForm } from '@/components/vehicles/vehicle-form';
import Image from 'next/image';
import { getPlaceholderImage } from '@/lib/placeholder-images';

type PageProps = {
  params: { [key: string]: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export default function RegisterVehiclePage(props: PageProps) {
  const editId = props.searchParams?.edit ? String(props.searchParams.edit) : null;
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
