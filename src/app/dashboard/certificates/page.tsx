'use client';

import React from 'react';
import { useUser, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Vehicle } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, FileCheck, Printer, ArrowLeft, Car } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function CertificatesPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const vehiclesQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, `users/${user.uid}/vehicles`), orderBy('brand'));
  }, [firestore, user?.uid]);

  const { data: vehicles, isLoading } = useCollection<Vehicle>(vehiclesQuery);

  if (isUserLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-12 flex items-center justify-center">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <CardTitle>Acceso Restringido</CardTitle>
            <CardDescription>Debes iniciar sesión para ver tus certificados.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard">Ir a Iniciar Sesión</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-headline text-primary flex items-center gap-2">
              <FileCheck /> Mis Certificados Digitales
            </h1>
            <p className="text-muted-foreground">Gestiona e imprime los certificados de autenticidad de tus vehículos.</p>
          </div>
          <Button variant="ghost" asChild>
            <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" /> Volver al Panel</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Certificados Registrados</CardTitle>
            <CardDescription>
              Estos certificados garantizan la propiedad y los datos técnicos de sus vehículos en nuestra red.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehículo</TableHead>
                  <TableHead>Número de Certificado</TableHead>
                  <TableHead>Fecha de Registro</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles && vehicles.length > 0 ? (
                  vehicles.map((vehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                           <div className="w-12 h-8 rounded bg-muted flex items-center justify-center relative overflow-hidden shrink-0">
                              {vehicle.imageUrls && vehicle.imageUrls[0] ? (
                                <Image src={vehicle.imageUrls[0]} alt={vehicle.brand} fill className="object-cover" />
                              ) : <Car className="h-4 w-4 text-muted-foreground" />}
                           </div>
                           <div className="flex flex-col">
                             <span className="text-sm font-bold">{vehicle.brand} {vehicle.model}</span>
                             <span className="text-xs text-muted-foreground">{vehicle.licensePlate}</span>
                           </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-[10px] bg-muted px-2 py-1 rounded font-mono">
                          {vehicle.certificateNumber}
                        </code>
                      </TableCell>
                      <TableCell className="text-sm">
                        {vehicle.year}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="outline" className="gap-2">
                          <Link href={`/dashboard/my-vehicles/${vehicle.id}/certificate`}>
                            <Printer className="h-4 w-4" /> Imprimir
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                      No se encontraron vehículos registrados con certificados.
                      <div className="mt-2">
                        <Button asChild variant="link">
                          <Link href="/dashboard/register-vehicle">Registrar mi primer vehículo</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
