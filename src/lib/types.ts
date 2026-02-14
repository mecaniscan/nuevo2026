import type { ImagePlaceholder } from './placeholder-images';
import { Timestamp } from 'firebase/firestore';

export type Workshop = {
    id: string;
    ownerId: string;
    name: string;
    description: string;
    address: string;
    contactNumber: string;
    whatsappNumber?: string;
    email: string;
    latitude: number;
    longitude: number;
    obdScannerService: boolean;
    averageRating: number;
    reviewCount: number;
    imageUrl?: string;
};

export type Appointment = {
    id: string;
    workshopId: string;
    workshopName?: string; // Denormalized for easy display
    userId: string;
    vehicleId: string; // Added field
    vehicleName: string; // Added field
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
    vehicleId: string;
    vehicleName: string; // Denormalized for easy display
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
    price?: number | null;
    currentMileage: number;
    imageUrls: string[];
    isForSale: boolean;
    country: string;
    sellerName: string;
    sellerWhatsapp: string;
    certificateNumber: string;
};

export type FavoriteWorkshop = {
    workshopId: string;
    name: string;
    address: string;
    imageUrl: string;
    averageRating: number;
    addedAt: Timestamp;
}


export type User = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    whatsappNumber?: string;
}
