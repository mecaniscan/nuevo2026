import Image from 'next/image';
import { getPlaceholderImage } from '@/lib/placeholder-images';
import RegisterVehicleForm from './form';

interface PageProps {
  searchParams?: {
    edit?: string;
  };
}

export default function RegisterVehiclePage({ searchParams }: PageProps) {
  const backgroundImage = getPlaceholderImage('login-background');
  const editId = searchParams?.edit;
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
      
      <RegisterVehicleForm editId={editId} currentYear={currentYear} />
    </div>
  );
}
