import { VehicleForm } from '@/components/vehicles/vehicle-form';

export default function RegisterVehiclePage({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined };
}) {
    const editId = typeof searchParams?.edit === 'string' ? searchParams.edit : null;
    
    return <VehicleForm editId={editId} />;
}
