'use client';
import React, { useState, useEffect } from 'react';
import { useUser, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Vehicle } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Printer, ShieldCheck, Calendar, MapPin, Hash, Car, User } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';

const InfoRow = ({ label, value, icon: Icon }: { label: string; value: string | number; icon?: any }) => (
    <div className="flex items-center justify-between py-2 border-b last:border-0 border-white/10">
        <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4" />}
            {label}
        </dt>
        <dd className="text-sm font-bold text-foreground">{value}</dd>
    </div>
);

export default function VehicleCertificatePage() {
  const params = useParams();
  const vehicleId = params.vehicleId as string;
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString());
  }, []);

  const vehicleRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid || !vehicleId) return null;
    return doc(firestore, `users/${user.uid}/vehicles`, vehicleId);
  }, [firestore, user?.uid, vehicleId]);

  const { data: vehicle, isLoading } = useDoc<Vehicle>(vehicleRef);

  if (isUserLoading || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !vehicle) {
    return (
      <div className="container mx-auto py-24 text-center">
        <h1 className="text-2xl font-bold mb-4">Vehículo no encontrado</h1>
        <Button asChild><Link href="/dashboard/my-vehicles">Volver a mis vehículos</Link></Button>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="container mx-auto py-12 px-4 print:p-0">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between no-print">
            <Button variant="ghost" asChild>
                <Link href="/dashboard/my-vehicles"><ArrowLeft className="mr-2 h-4 w-4"/> Volver</Link>
            </Button>
            <div className="flex gap-2">
                <Button onClick={handlePrint} variant="outline" className="gap-2">
                    <Printer className="h-4 w-4" /> Imprimir
                </Button>
            </div>
        </div>

        <Card className="border-4 border-primary/20 shadow-2xl relative overflow-hidden bg-card">
            {/* Background Emblem */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
                <ShieldCheck className="h-[400px] w-[400px]" />
            </div>

            <CardHeader className="text-center pb-2 border-b border-primary/20 bg-primary/5">
                <div className="flex justify-center mb-4">
                    <div className="bg-primary/10 p-4 rounded-full border-2 border-primary/30">
                        <ShieldCheck className="h-12 w-12 text-primary" />
                    </div>
                </div>
                <CardTitle className="text-3xl font-headline font-bold text-primary uppercase tracking-widest">
                    Certificado de Venta Digital
                </CardTitle>
                <CardDescription className="text-lg font-medium text-foreground">
                    MecaniScan - Registro Oficial de Propiedad y Venta
                </CardDescription>
            </CardHeader>

            <CardContent className="pt-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Información del Vehículo</h3>
                            <Separator className="bg-primary/20" />
                        </div>
                        <dl>
                            <InfoRow label="Marca" value={vehicle.brand} icon={Car} />
                            <InfoRow label="Modelo" value={vehicle.model} icon={Car} />
                            <InfoRow label="Año" value={vehicle.year} icon={Calendar} />
                            <InfoRow label="Kilometraje" value={`${vehicle.currentMileage.toLocaleString()} km`} icon={Hash} />
                            <InfoRow label="Placa" value={vehicle.licensePlate || 'N/A'} icon={Hash} />
                            <InfoRow label="VIN" value={vehicle.vin || 'N/A'} icon={Hash} />
                            <InfoRow label="País" value={vehicle.country} icon={MapPin} />
                        </dl>
                    </div>

                    <div className="flex flex-col items-center justify-center space-y-6">
                        <div className="relative w-48 h-48 border-4 border-primary/10 rounded-xl overflow-hidden shadow-inner bg-muted">
                           {vehicle.imageUrls && vehicle.imageUrls[0] ? (
                               <Image src={vehicle.imageUrls[0]} alt="Vehículo" fill className="object-cover" />
                           ) : (
                               <Car className="h-24 w-24 text-muted-foreground m-auto absolute inset-0" />
                           )}
                        </div>
                        <div className="text-center space-y-2">
                             <div className="bg-white p-2 rounded-lg inline-block border-2 border-primary/20">
                                <Image 
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`https://mecaniscan.app/validate-certificate/${vehicle.certificateNumber}`)}`}
                                    alt="QR Verification"
                                    width={120}
                                    height={120}
                                    className="rounded"
                                />
                             </div>
                             <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                                Escanee para validar autenticidad
                             </p>
                        </div>
                    </div>
                </div>

                <div className="bg-primary/5 p-6 rounded-lg border border-primary/10 space-y-4">
                    <h3 className="text-sm font-bold uppercase text-center border-b border-primary/10 pb-2">Detalles del Registro y Venta</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold">Número de Certificado</p>
                                <p className="text-xs font-mono font-bold break-all text-primary">{vehicle.certificateNumber}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold">Titular del Registro (Vendedor)</p>
                                <p className="text-sm font-bold">{vehicle.sellerName}</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
                                    <User className="h-3 w-3" /> Nombre del Comprador
                                </p>
                                <div className="mt-1 h-8 border-b-2 border-dotted border-primary/30 w-full flex items-end">
                                    <span className="text-xs text-muted-foreground italic px-1 print:hidden">Espacio para completar...</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
                                    <Hash className="h-3 w-3" /> Identificación del Comprador
                                </p>
                                <div className="mt-1 h-8 border-b-2 border-dotted border-primary/30 w-full flex items-end">
                                    <span className="text-xs text-muted-foreground italic px-1 print:hidden">DNI / Pasaporte...</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-12 pt-12">
                    <div className="text-center space-y-2">
                        <div className="border-t border-foreground/40 pt-2">
                            <p className="text-[10px] font-bold uppercase">Firma del Vendedor</p>
                            <p className="text-[9px] text-muted-foreground">{vehicle.sellerName}</p>
                        </div>
                    </div>
                    <div className="text-center space-y-2">
                        <div className="border-t border-foreground/40 pt-2">
                            <p className="text-[10px] font-bold uppercase">Firma del Comprador</p>
                            <p className="text-[9px] text-muted-foreground">Nombre y Apellido</p>
                        </div>
                    </div>
                </div>

                <div className="text-center pt-8 space-y-4">
                    <p className="text-[10px] text-muted-foreground max-w-lg mx-auto italic leading-tight">
                        "Este documento certifica que el vehículo descrito se encuentra registrado oficialmente en la plataforma MecaniScan. El código único de verificación garantiza que los datos coinciden con nuestra base de datos. La validez legal definitiva de la venta depende de la ratificación de las partes ante las autoridades competentes."
                    </p>
                    <div className="flex justify-center pt-2">
                        <div className="bg-primary/10 px-4 py-1 rounded-full border border-primary/20">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-primary">Sello de Verificación Digital</p>
                        </div>
                    </div>
                </div>
            </CardContent>
            
            <CardFooter className="bg-primary/5 border-t border-primary/20 py-4 flex justify-between text-[10px] text-muted-foreground font-bold uppercase">
                <span>Fecha de Emisión: {currentDate}</span>
                <span>MecaniScan v1.2 - Seguridad Vehicular Avanzada</span>
            </CardFooter>
        </Card>

        <style jsx global>{`
          @media print {
            .no-print { display: none !important; }
            body { background: white !important; padding: 0 !important; }
            .container { max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
            .shadow-2xl { box-shadow: none !important; }
            .border-4 { border-width: 1px !important; }
            .bg-card { background: white !important; color: black !important; }
            .text-muted-foreground { color: #666 !important; }
            .border-white\/10 { border-color: #eee !important; }
          }
        `}</style>
      </div>
    </div>
  );
}
