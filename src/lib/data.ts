import type { Service, Workshop } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export const workshops: Workshop[] = [];

export const masterServices: Omit<Service, 'id'>[] = [
    { name: "Cambio de Aceite y Filtro", description: "Cambio de aceite de motor y filtro de aceite.", price: 50 },
    { name: "Rotación de Neumáticos", description: "Rotación de los cuatro neumáticos para un desgaste uniforme.", price: 25 },
    { name: "Alineación de Ruedas", description: "Ajuste de la suspensión para alinear los ángulos de las ruedas.", price: 80 },
    { name: "Diagnóstico con Escáner OBD-II", description: "Lectura de códigos de diagnóstico del vehículo.", price: 40 },
    { name: "Inspección y Reemplazo de Frenos", description: "Inspección de pastillas, discos y líquido de frenos.", price: 150 },
    { name: "Reemplazo de Batería", description: "Instalación de una nueva batería de coche.", price: 120 },
    { name: "Servicio de Aire Acondicionado", description: "Inspección y recarga del sistema de A/C.", price: 75 }
];
