import type { ImagePlaceholder } from './placeholder-images';

export type Workshop = {
    id: string;
    ownerId: string;
    name: string;
    description: string;
    address: string;
    contactNumber: string;
    email: string;
    latitude: number;
    longitude: number;
    obdScannerService: boolean;
    serviceIds: string[]; // List of service IDs offered by the workshop
    rating: number; // Placeholder, as it's not in the backend.json schema
    reviewCount: number; // Placeholder
    services: Service[]; // Populated placeholder for service details
    image: ImagePlaceholder; // Placeholder for image
    city: string; // Placeholder
};

export type Appointment = {
    id: string;
    workshopId: string;
    userId: string;
    serviceId?: string; 
    serviceName?: string; // Denormalized service name
    appointmentDateTime: string;
    description: string;
    status: 'scheduled' | 'completed' | 'cancelled';
}

export type Service = {
    id: string;
    name: string;
    description: string;
    price: number;
}
