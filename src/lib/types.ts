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
    rating: number; // Placeholder, as it's not in the backend.json schema
    reviewCount: number; // Placeholder
    services: string[]; // Placeholder for service names
    image: ImagePlaceholder; // Placeholder for image
    city: string; // Placeholder
};

export type Appointment = {
    id: string;
    workshopId: string;
    userId: string;
    serviceId: string; // For now, we'll just use a string
    appointmentDateTime: string;
    description: string;
    status: 'scheduled' | 'completed' | 'cancelled';
}
