'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useUser, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Car, Trash2 } from 'lucide-react';
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
} from "@/components/ui/alert-dialog"

const vehicleSchema = z.object({
  type: z.string().min(3, 'El tipo es muy corto.'),
  brand: z.string().min(2, 'La marca es muy corta.'),
  model: z.string().min(1, 'El modelo es muy corto.'),
  year: z.preprocess(
    (a) => parseInt(z.string().parse(a), 10),
    z.number().min(1900, 'Año inválido.').max(new Date().getFullYear() + 1, 'Año inválido.')
  ),
  vin: z.string().length(17, 'El VIN debe tener 17 caracteres.'),
  licensePlate: z.string().min(3, 'La placa es muy corta.'),
});

export default function MyVehiclesPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const vehiclesCollection = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, `users/${user.uid}/vehicles`);
  }, [firestore, user]);

  const vehiclesQuery = useMemoFirebase(() => {
    if (!vehiclesCollection) return null;
    return query(vehiclesCollection, orderBy('brand'));
  }, [vehiclesCollection]);

  const { data: vehicles, isLoading: areVehiclesLoading } = useCollection<Vehicle>(vehiclesQuery);

  const form = useForm<z.infer<typeof vehicleSchema>>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      type: '',
      brand: '',
      model: '',
      year: new Date().getFullYear(),
      vin: '',
      licensePlate: '',
    },
  });

  async function onSubmit(values: z.infer<typeof vehicleSchema>) {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Debes iniciar sesión.' });
      return;
    }

    setIsSubmitting(true);

    try {
      const vehicleData = {
        ...values,
        userId: user.uid,
      };
      
      addDocumentNonBlocking(collection(firestore, `users/${user.uid}/vehicles`), vehicleData);
      
      toast({
        title: '¡Vehículo Añadido!',
        description: 'Tu vehículo ha sido guardado.',
      });
      form.reset();
    } catch (error) {
      console.error('Error adding vehicle:', error);
      toast({
        variant: 'destructive',
        title: 'Error Inesperado',
        description: 'No se pudo guardar el vehículo.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleDeleteVehicle(vehicleId: string) {
     if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'No autenticado.' });
      return;
    }
    const docRef = doc(firestore, `users/${user.uid}/vehicles`, vehicleId);
    deleteDocumentNonBlocking(docRef);
    toast({
        title: 'Vehículo Eliminado',
        description: 'El vehículo ha sido eliminado de tu registro.',
    })
  }

  const isLoading = isUserLoading || areVehiclesLoading;
  
  return (
    <div className="container mx-auto py-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold font-headline text-primary flex items-center gap-2"><Car />Mis Vehículos</h1>
                <p className="text-muted-foreground">Añade y consulta el registro de tus vehículos.</p>
            </div>
             <Button variant="ghost" asChild>
                <Link href="/dashboard">Volver al Panel</Link>
            </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Añadir Nuevo Vehículo</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo</FormLabel>
                        <FormControl><Input placeholder="Ej: Sedan, SUV" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="brand"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Marca</FormLabel>
                        <FormControl><Input placeholder="Ej: Toyota" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Modelo</FormLabel>
                        <FormControl><Input placeholder="Ej: Corolla" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Año</FormLabel>
                        <FormControl><Input type="number" placeholder="2022" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="licensePlate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Placa</FormLabel>
                        <FormControl><Input placeholder="ABC-123" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="vin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código VIN</FormLabel>
                        <FormControl><Input placeholder="17 caracteres" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <PlusCircle className="mr-2" />
                  Guardar Vehículo
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Mis Vehículos Registrados</CardTitle>
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
                                <TableHead>Placa</TableHead>
                                <TableHead>VIN</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {vehicles && vehicles.length > 0 ? (
                                vehicles.map((vehicle) => (
                                    <TableRow key={vehicle.id}>
                                        <TableCell className="font-medium">{vehicle.brand} {vehicle.model}</TableCell>
                                        <TableCell>{vehicle.year}</TableCell>
                                        <TableCell>{vehicle.licensePlate}</TableCell>
                                        <TableCell className="font-mono text-xs">{vehicle.vin}</TableCell>
                                        <TableCell className="text-right">
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Esta acción no se puede deshacer. Esto eliminará permanentemente
                                                            el vehículo de tus registros.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() => handleDeleteVehicle(vehicle.id)}
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
