'use client';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useFirestore, useMemoFirebase, FirestorePermissionError, errorEmitter, useCollection } from '@/firebase';
import { collection, query, orderBy, doc, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Car, Trash2, Pencil, Briefcase, BadgePercent, FileText, Search, Printer } from 'lucide-react';
import Link from 'next/link';
import type { Vehicle } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

export default function MyVehiclesPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const vehiclesCollectionRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, `users/${user.uid}/vehicles`);
  }, [firestore, user?.uid]);

  const vehiclesQuery = useMemoFirebase(() => {
    if (!vehiclesCollectionRef) return null;
    return query(vehiclesCollectionRef, orderBy('brand'));
  }, [vehiclesCollectionRef]);

  const { data: vehicles, isLoading: areVehiclesLoading } = useCollection<Vehicle>(vehiclesQuery);

  function handleDeleteVehicle(vehicle: Vehicle) {
    if (!user || !firestore || !vehiclesCollectionRef) {
        toast({ variant: 'destructive', title: 'Error', description: 'No autenticado.' });
        return;
    }
    
    const batch = writeBatch(firestore);
    const userVehicleRef = doc(vehiclesCollectionRef, vehicle.id);
    
    batch.delete(userVehicleRef);

    if (vehicle.isForSale) {
        const marketplaceRef = doc(firestore, 'marketplace', vehicle.id);
        batch.delete(marketplaceRef);
    }
    
    batch.commit()
        .then(() => {
            toast({
                title: 'Vehículo Eliminado',
                description: 'El vehículo ha sido eliminado de tus registros.',
            });
        })
        .catch(() => {
             errorEmitter.emit('permission-error', new FirestorePermissionError({
                 path: `users/${user.uid}/vehicles/${vehicle.id}`,
                 operation: 'delete',
            }));
        });
  }

  const isLoading = isUserLoading || areVehiclesLoading;
  
  if (isUserLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && !isUserLoading) {
    return (
      <div className="container mx-auto py-12 flex items-center justify-center">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <CardTitle>Acceso Restringido</CardTitle>
            <CardDescription>Debes iniciar sesión para gestionar tus vehículos.</CardDescription>
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
                <h1 className="text-3xl font-bold font-headline text-primary flex items-center gap-2"><Car />Mis Vehículos</h1>
                <p className="text-muted-foreground">Consulta el registro de tus vehículos.</p>
            </div>
            <div className='flex gap-4'>
                <Button asChild>
                    <Link href="/dashboard/register-vehicle"><PlusCircle className="mr-2 h-4 w-4" /> Registrar Nuevo Vehículo</Link>
                </Button>
                <Button variant="ghost" asChild>
                    <Link href="/dashboard">Volver al Panel</Link>
                </Button>
            </div>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Mis Vehículos Registrados</CardTitle>
                <CardDescription>Para validar la autenticidad de un vehículo en venta, copie el número de certificado y úselo en el portal de validación de la página de inicio.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                     <div className="flex h-40 items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Vehículo</TableHead>
                                <TableHead>Año</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Certificado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {vehicles && vehicles.length > 0 ? (
                                vehicles.map((vehicle) => (
                                    <TableRow key={vehicle.id}>
                                        <TableCell className="font-medium flex items-center gap-3">
                                            <div className="w-16 h-10 rounded-md bg-muted flex items-center justify-center text-muted-foreground relative overflow-hidden">
                                                {vehicle.imageUrls && vehicle.imageUrls.length > 0 ? (
                                                    <Image src={vehicle.imageUrls[0]} alt={`${vehicle.brand} ${vehicle.model}`} fill className="object-cover" />
                                                ) : <Car/>}
                                            </div>
                                            <div className="flex flex-col">
                                                <span>{vehicle.brand} {vehicle.model}</span>
                                                <span className="text-xs text-muted-foreground">{vehicle.licensePlate}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{vehicle.year}</TableCell>
                                        <TableCell>
                                          {vehicle.isForSale ? (
                                            <Badge><BadgePercent className="mr-1 h-3 w-3"/> Venta</Badge>
                                          ) : (
                                            <Badge variant="secondary">Personal</Badge>
                                          )}
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-[10px] font-mono break-all max-w-[120px] block leading-tight text-muted-foreground">
                                                {vehicle.certificateNumber}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="text-blue-500 hover:bg-blue-500/10" asChild title="Ver Certificado">
                                                <Link href={`/dashboard/my-vehicles/${vehicle.id}/certificate`}><Printer className="h-4 w-4" /></Link>
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/10" asChild title="Editar">
                                                <Link href={`/dashboard/register-vehicle?edit=${vehicle.id}`}><Pencil className="h-4 w-4" /></Link>
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" title="Eliminar">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Esta acción no se puede deshacer. Esto eliminará permanentemente
                                                            el vehículo de tus registros y del marketplace.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() => handleDeleteVehicle(vehicle)}
                                                            className="bg-destructive hover:bg-destructive/90"
                                                        >
                                                            Eliminar
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">
                                        No has registrado ningún vehículo todavía.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}