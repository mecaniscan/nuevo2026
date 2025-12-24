'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Vehicle, User } from '@/lib/types';
import { Loader2, Wrench, Printer, ArrowLeft, PenSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

const CertificateItem = ({ label, value }: { label: string; value: string | number | undefined }) => (
    <div className="flex justify-between py-2 border-b border-dashed">
        <dt className="text-sm text-muted-foreground">{label}:</dt>
        <dd className="text-sm font-semibold text-foreground">{value || 'N/A'}</dd>
    </div>
);

export default function VehicleCertificatePage() {
    const params = useParams();
    const vehicleId = params.id as string;
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();

    const vehicleDocRef = useMemoFirebase(() => {
        if (!firestore || !user || !vehicleId) return null;
        return doc(firestore, `users/${user.uid}/vehicles`, vehicleId);
    }, [firestore, user, vehicleId]);

    const userDocRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);

    const { data: vehicle, isLoading: isVehicleLoading } = useDoc<Vehicle>(vehicleDocRef);
    const { data: userData, isLoading: isUserDataLoading } = useDoc<User>(userDocRef);

    const isLoading = isUserLoading || isVehicleLoading || isUserDataLoading;

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-muted">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
        );
    }

    if (!user || !vehicle || !userData) {
        return (
             <div className="flex h-screen items-center justify-center bg-muted">
                 <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <CardTitle>Error</CardTitle>
                        <CardDescription>No se pudo generar el certificado. Es posible que no tengas permiso o que el vehículo no exista.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild><Link href="/dashboard/my-vehicles">Volver a mis vehículos</Link></Button>
                    </CardContent>
                 </Card>
             </div>
        );
    }
    
    const handlePrint = () => {
        window.print();
    };


    return (
        <div className="bg-muted min-h-screen py-12 px-4 @media print:bg-white print:py-0">
             <div className="max-w-3xl mx-auto">
                <div className="flex justify-between items-center mb-8 print:hidden">
                    <Button variant="outline" asChild>
                        <Link href="/dashboard/my-vehicles"><ArrowLeft className="mr-2"/> Volver</Link>
                    </Button>
                    <Button onClick={handlePrint}>
                        <Printer className="mr-2" />
                        Imprimir o Guardar PDF
                    </Button>
                </div>
                
                <Card className="shadow-2xl print:shadow-none print:border-none">
                    <CardHeader className="bg-primary/5 p-8 border-b-2 border-primary/20">
                         <div className="flex items-center gap-4">
                            <Wrench className="h-10 w-10 text-primary" />
                            <div>
                                <h1 className="text-3xl font-bold font-headline text-primary">Certificado de Venta de Vehículo</h1>
                                <p className="text-muted-foreground">Documento privado generado por MecaniScan</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8">
                        <div>
                            <h2 className="text-xl font-semibold mb-4 border-b pb-2">Datos del Vendedor</h2>
                            <dl className="space-y-1">
                                <CertificateItem label="Nombre Completo" value={`${userData.firstName} ${userData.lastName}`} />
                                <CertificateItem label="Correo Electrónico" value={userData.email} />
                                <CertificateItem label="Número de WhatsApp" value={userData.whatsappNumber} />
                                <CertificateItem label="Fecha de Emisión" value={format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es })} />
                            </dl>
                        </div>
                        <Separator />
                         <div>
                            <h2 className="text-xl font-semibold mb-4 border-b pb-2">Datos del Vehículo</h2>
                             <dl className="space-y-1">
                                <CertificateItem label="Marca" value={vehicle.brand} />
                                <CertificateItem label="Modelo" value={vehicle.model} />
                                <CertificateItem label="Año" value={vehicle.year} />
                                <CertificateItem label="Tipo" value={vehicle.type} />
                                <CertificateItem label="Código VIN" value={vehicle.vin} />
                                <CertificateItem label="Placa" value={vehicle.licensePlate} />
                                <CertificateItem label="Kilometraje Actual" value={`${vehicle.currentMileage.toLocaleString()} km`} />
                                <CertificateItem label="País de Registro" value={vehicle.country} />
                                <CertificateItem label="Precio de Venta Sugerido" value={`$${vehicle.price.toLocaleString()}`} />
                            </dl>
                        </div>
                         <Separator />
                         <div>
                            <h2 className="text-xl font-semibold mb-4 border-b pb-2">Datos del Comprador</h2>
                             <div className="space-y-10 pt-4">
                                <div className="space-y-2">
                                    <div className="w-full h-12 border-b border-foreground/50"></div>
                                    <p className="text-center text-sm text-muted-foreground">Firma del Comprador</p>
                                </div>
                                <div className="space-y-2">
                                     <div className="w-full h-8 border-b border-foreground/50"></div>
                                     <p className="text-center text-sm text-muted-foreground">Nombre y Apellido</p>
                                </div>
                                <div className="space-y-2">
                                    <div className="w-full h-8 border-b border-foreground/50"></div>
                                    <p className="text-center text-sm text-muted-foreground">Número de Identificación</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="bg-muted/50 p-6 text-center">
                         <p className="text-xs text-muted-foreground">
                            Este documento es un certificado de venta privado generado para facilitar la transacción entre las partes. 
                            MecaniScan no se hace responsable de la veracidad de los datos ni del estado del vehículo. 
                            Se recomienda realizar una inspección profesional antes de la compra.
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
