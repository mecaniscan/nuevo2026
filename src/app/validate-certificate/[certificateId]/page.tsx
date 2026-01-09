'use client';
import React from 'react';
import { useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Vehicle } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, FileText, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { useParams } from 'next/navigation';

const CertificateItem = ({ label, value }: { label: string; value: string | number | undefined }) => (
    <div className="flex justify-between py-2 border-b">
        <dt className="text-sm text-muted-foreground">{label}:</dt>
        <dd className="text-sm font-semibold text-foreground">{value || 'N/A'}</dd>
    </div>
);

export default function ValidateCertificatePage() {
  const params = useParams();
  const certificateId = params.certificateId as string;
  const firestore = useFirestore();

  const vehiclesCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'marketplace');
  }, [firestore]);

  const certificateQuery = useMemoFirebase(() => {
    if (!vehiclesCollection || !certificateId) return null;
    return query(vehiclesCollection, where('certificateNumber', '==', certificateId));
  }, [vehiclesCollection, certificateId]);

  const { data: vehicles, isLoading } = useCollection<Vehicle>(certificateQuery);
  const vehicle = vehicles?.[0];

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-headline text-primary"><FileText /> Certificado de Venta Digital</CardTitle>
          <CardDescription>Resultados para el número de certificado: {certificateId}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Buscando certificado...</p>
            </div>
          ) : vehicle ? (
            <div className="space-y-6">
                <div className="flex flex-col items-center text-center p-4 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400 mb-2"/>
                    <h3 className="text-xl font-bold text-green-800 dark:text-green-200">Certificado Válido</h3>
                    <p className="text-green-700 dark:text-green-300">Este certificado es auténtico y corresponde al siguiente vehículo.</p>
                </div>

                {vehicle.imageUrls && vehicle.imageUrls[0] && (
                    <div className="relative h-64 w-full rounded-lg overflow-hidden">
                        <Image src={vehicle.imageUrls[0]} alt={`${vehicle.brand} ${vehicle.model}`} fill className="object-cover" />
                    </div>
                )}
                
                <dl className="space-y-2">
                    <CertificateItem label="Marca" value={vehicle.brand} />
                    <CertificateItem label="Modelo" value={vehicle.model} />
                    <CertificateItem label="Año" value={vehicle.year} />
                    <CertificateItem label="Código VIN" value={vehicle.vin} />
                    <CertificateItem label="Placa" value={vehicle.licensePlate} />
                    <CertificateItem label="Precio de Venta" value={`$${vehicle.price?.toLocaleString()}`} />
                    <CertificateItem label="Vendedor" value={vehicle.sellerName} />
                </dl>
                 <Separator />
                <p className="text-xs text-muted-foreground text-center pt-4">
                  Esta es una verificación de la autenticidad del documento digital. MecaniScan no se hace responsable por el estado físico del vehículo. Se recomienda una inspección profesional.
                </p>

            </div>
          ) : (
            <div className="flex flex-col items-center text-center p-4 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <XCircle className="w-12 h-12 text-red-600 dark:text-red-400 mb-2"/>
                <h3 className="text-xl font-bold text-red-800 dark:text-red-200">Certificado no válido o no encontrado</h3>
                <p className="text-red-700 dark:text-red-300">No se pudo encontrar ningún vehículo en el Marketplace que coincida con este número de certificado.</p>
            </div>
          )}
        </CardContent>
        <CardContent className='flex justify-center gap-4'>
            <Button asChild variant="outline" className="text-orange-500 border-orange-500 hover:bg-orange-500 hover:text-white"><Link href="/"><ArrowLeft className="mr-2 h-4 w-4"/>Volver a la Página Principal</Link></Button>
            <Button asChild><Link href="/marketplace">Ir al Marketplace</Link></Button>
        </CardContent>
      </Card>
    </div>
  );
}
