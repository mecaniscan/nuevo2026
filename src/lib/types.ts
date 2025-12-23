import type { ImagePlaceholder } from './placeholder-images';
import { Timestamp } from 'firebase/firestore';

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
    averageRating: number;
    reviewCount: number;
    image: ImagePlaceholder; // Placeholder for image
    city: string; // Placeholder
};

export type Appointment = {
    id: string;
    workshopId: string;
    userId: string;
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

export type Review = {
    id: string;
    workshopId: string;
    userId: string;
    rating: number;
    comment: string;
    createdAt: Timestamp | string;
    authorName?: string; // Denormalized user name
};

export type OilChange = {
    id: string;
    userId: string;
    date: string | Timestamp;
    oilType: string;
    oilPrice: number;
    mileage: number;
    nextChangeMileage: number;
};

export type Vehicle = {
    id: string;
    userId: string;
    type: string;
    brand: string;
    model: string;
    year: number;
    vin: string;
    licensePlate: string;
};
