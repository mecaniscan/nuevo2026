'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useFirestore, useMemoFirebase, useCollection, FirestorePermissionError, errorEmitter } from '@/firebase';
import { collection, query, orderBy, serverTimestamp, Timestamp, doc, addDoc, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Droplets, Trash2, ArrowLeft, History } from 'lucide-react';
import Link from 'next/link';
import type { OilChange, Vehicle } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const oilChangeSchema = z.object({
  vehicleId: z.string({ required_error: 'Debes seleccionar un vehículo.' }).min(1, 'Selecciona un vehículo.'),
  oilType: z.string().min(3, 'El tipo de aceite debe tener al menos 3 caracteres.'),
  oilPrice: z.coerce.number().positive('El precio debe ser un número positivo.'),
  mileage: z.coerce.number().positive('El kilometraje debe ser un número positivo.'),
  nextChangeMileage: z.coerce.number().positive('El próximo kilometraje debe ser un número positivo.'),
}).refine(data => data.nextChangeMileage > data.mileage, {
  message: "El kilometraje del próximo cambio debe ser mayor al actual.",
  path: ["nextChangeMileage"],
});

export default function OilChangesPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Vehicles
  const vehiclesCollection = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, `users/${user.uid}/vehicles`);
  }, [firestore, user?.uid]);
  const { data: vehicles, isLoading: areVehiclesLoading } = useCollection<Vehicle>(vehiclesCollection);

  // Fetch Oil Changes
  const oilChangesCollection = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, `users/${user.uid}/oilChanges`);
  }, [firestore, user?.uid]);

  const oilChangesQuery = useMemoFirebase(() => {
    if (!oilChangesCollection) return null;
    return query(oilChangesCollection, orderBy('date', 'desc'));
  }, [oilChangesCollection]);

  const { data: oilChanges, isLoading: areOilChangesLoading } = useCollection<OilChange>(oilChangesQuery);

  const form = useForm<z.infer<typeof oilChangeSchema>>({
    resolver: zodResolver(oilChangeSchema),
    defaultValues: {
      vehicleId: '',
      oilType: '',
      oilPrice: 0,
      mileage: 0,
      nextChangeMileage: 0,
    },
  });

  function onSubmit(values: z.infer<typeof oilChangeSchema>) {
    if (!user || !firestore || !vehicles) {
      toast({ variant: 'destructive', title: 'Error', description: 'Debes iniciar sesión.' });
      return;
    }

    setIsSubmitting(true);

    const selectedVehicle = vehicles.find(v => v.id === values.vehicleId);
    if (!selectedVehicle) {
        toast({ variant: 'destructive', title: 'Error', description: 'Vehículo no válido.' });
        setIsSubmitting(false);
        return;
    }
    
    const oilChangeData = {
        ...values,
        userId: user.uid,
        vehicleName: `${selectedVehicle.brand} ${selectedVehicle.model}`,
        date: serverTimestamp(),
      };

    const oilChangesColRef = collection(firestore, `users/${user.uid}/oilChanges`);
    
    addDoc(oilChangesColRef, oilChangeData)
        .then(() => {
            toast({
                title: '¡Registro Añadido!',
                description: 'El cambio de aceite ha sido guardado.',
            });
            form.reset();
        })
        .catch(() => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: `users/${user.uid}/oilChanges`,
                operation: 'create',
                requestResourceData: oilChangeData
            }));
        })
        .finally(() => {
          setIsSubmitting(false);
        });
  }

  function handleDeleteOilChange(oilChangeId: string) {
    if (!user || !firestore) return;
    const docRef = doc(firestore, `users/${user.uid}/oilChanges`, oilChangeId);
    
    deleteDoc(docRef)
        .then(() => {
            toast({ title: 'Registro Eliminado', description: 'El historial ha sido actualizado.' });
        })
        .catch(() => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: docRef.path,
                operation: 'delete'
            }));
        });
  }

  const isLoading = isUserLoading || areOilChangesLoading || areVehiclesLoading;
  
  const formatDate = (dateValue: string | Timestamp | undefined) => {
    if (!dateValue) return '---';
    try {
        const date = (dateValue as Timestamp)?.toDate ? (dateValue as Timestamp).toDate() : new Date(dateValue as string);
        return format(date, 'dd MMM yyyy', { locale: es });
    } catch {
        return "Fecha inválida";
    }
  };
  
  if (isUserLoading) {
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
            <CardDescription>Debes iniciar sesión para gestionar los cambios de aceite.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild><Link href="/dashboard">Ir a Iniciar Sesión</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold font-headline text-primary flex items-center gap-2"><Droplets /> Cambios de Aceite</h1>
                <p className="text-muted-foreground">Historial de mantenimiento preventivo.</p>
            </div>
             <Button variant="ghost" asChild>
                <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" /> Volver</Link>
            </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-1 border-primary/20 shadow-lg">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <CardTitle className="text-xl">Nuevo Registro</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                      control={form.control}
                      name="vehicleId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vehículo</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''} disabled={!vehicles?.length}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={!vehicles?.length ? "No hay vehículos" : "Seleccionar..."} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {vehicles?.map(v => (
                                <SelectItem key={v.id} value={v.id}>{v.brand} {v.model}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  <FormField
                    control={form.control}
                    name="oilType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Aceite</FormLabel>
                        <FormControl><Input placeholder="Ej: 10W-40" {...field} value={field.value || ''} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="oilPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Precio ($)</FormLabel>
                        <FormControl><Input type="number" step="0.01" {...field} value={field.value || ''} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="mileage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>KM Actual</FormLabel>
                        <FormControl><Input type="number" {...field} value={field.value || ''} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nextChangeMileage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Próximo Cambio (KM)</FormLabel>
                        <FormControl><Input type="number" {...field} value={field.value || ''} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isSubmitting || !vehicles?.length}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                    Guardar Registro
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
          
          <Card className="lg:col-span-2 shadow-lg">
              <CardHeader className="flex flex-row items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  <CardTitle>Historial Reciente</CardTitle>
              </CardHeader>
              <CardContent>
                  {isLoading ? (
                       <div className="flex h-60 items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary/50" /></div>
                  ) : (
                      <Table>
                          <TableHeader>
                              <TableRow>
                                  <TableHead>Fecha</TableHead>
                                  <TableHead>Vehículo</TableHead>
                                  <TableHead>Aceite</TableHead>
                                  <TableHead>Próximo (KM)</TableHead>
                                  <TableHead className="text-right">Acción</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {oilChanges?.length ? (
                                  oilChanges.map((change) => (
                                      <TableRow key={change.id} className="hover:bg-muted/30">
                                          <TableCell className="text-xs">{formatDate(change.date)}</TableCell>
                                          <TableCell className="font-medium text-xs">{change.vehicleName}</TableCell>
                                          <TableCell className="text-xs">{change.oilType}</TableCell>
                                          <TableCell className="text-xs font-bold text-orange-500">{change.nextChangeMileage.toLocaleString()}</TableCell>
                                          <TableCell className="text-right">
                                              <AlertDialog>
                                                  <AlertDialogTrigger asChild>
                                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                                          <Trash2 className="h-4 w-4" />
                                                      </Button>
                                                  </AlertDialogTrigger>
                                                  <AlertDialogContent>
                                                      <AlertDialogHeader>
                                                          <AlertDialogTitle>¿Eliminar registro?</AlertDialogTitle>
                                                          <AlertDialogDescription>Esta acción es permanente y no se puede deshacer.</AlertDialogDescription>
                                                      </AlertDialogHeader>
                                                      <AlertDialogFooter>
                                                          <AlertDialogCancel>No, cancelar</AlertDialogCancel>
                                                          <AlertDialogAction onClick={() => handleDeleteOilChange(change.id)} className="bg-destructive hover:bg-destructive/90">Sí, eliminar</AlertDialogAction>
                                                      </AlertDialogFooter>
                                                  </AlertDialogContent>
                                              </AlertDialog>
                                          </TableCell>
                                      </TableRow>
                                  ))
                              ) : (
                                  <TableRow>
                                      <TableCell colSpan={5} className="text-center h-40 text-muted-foreground italic">
                                          No hay registros cargados.
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
    </div>
  );
}
