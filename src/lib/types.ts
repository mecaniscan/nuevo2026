import type { ImagePlaceholder } from './placeholder-images';

export type Workshop = {
    id: string;
    name: string;
    address: string;
    city: string;
    rating: number;
    reviewCount: number;
    hasObdiiScanner: boolean;
    services: string[];
    image: ImagePlaceholder;
};
