'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Droplets } from 'lucide-react';
import Link from 'next/link';
import type { OilChange } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


const oilChangeSchema = z.object({
  oilType: z.string().min(3, 'El tipo de aceite debe tener al menos 3 caracteres.'),
  oilPrice: z.preprocess(
    (a) => parseFloat(z.string().parse(a)),
    z.number().positive('El precio debe ser un número positivo.')
  ),
  mileage: z.preprocess(
    (a) => parseInt(z.string().parse(a), 10),
    z.number().positive('El kilometraje debe ser un número positivo.')
  ),
  nextChangeMileage: z.preprocess(
    (a) => parseInt(z.string().parse(a), 10),
    z.number().positive('El próximo kilometraje debe ser un número positivo.')
  ),
});

export default function OilChangesPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const oilChangesCollection = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, `users/${user.uid}/oilChanges`);
  }, [firestore, user]);

  const oilChangesQuery = useMemoFirebase(() => {
    if (!oilChangesCollection) return null;
    return query(oilChangesCollection, orderBy('date', 'desc'));
  }, [oilChangesCollection]);

  const { data: oilChanges, isLoading: areOilChangesLoading } = useCollection<OilChange>(oilChangesQuery);

  const form = useForm<z.infer<typeof oilChangeSchema>>({
    resolver: zodResolver(oilChangeSchema),
    defaultValues: {
      oilType: '',
      oilPrice: 0,
      mileage: 0,
      nextChangeMileage: 0,
    },
  });

  async function onSubmit(values: z.infer<typeof oilChangeSchema>) {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Debes iniciar sesión.' });
      return;
    }

    if (values.nextChangeMileage <= values.mileage) {
        form.setError("nextChangeMileage", { type: "manual", message: "El próximo cambio debe ser mayor al kilometraje actual." });
        return;
    }

    setIsSubmitting(true);

    try {
      const oilChangeData = {
        ...values,
        userId: user.uid,
        date: serverTimestamp(),
      };
      
      addDocumentNonBlocking(collection(firestore, `users/${user.uid}/oilChanges`), oilChangeData);
      
      toast({
        title: '¡Registro Añadido!',
        description: 'El cambio de aceite ha sido guardado en tu historial.',
      });
      form.reset();
    } catch (error) {
      console.error('Error adding oil change:', error);
      toast({
        variant: 'destructive',
        title: 'Error Inesperado',
        description: 'No se pudo guardar el registro.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const isLoading = isUserLoading || areOilChangesLoading;
  
  const formatDate = (dateValue: string | Timestamp) => {
    if (!dateValue) return '';
    const date = (dateValue as Timestamp)?.toDate ? (dateValue as Timestamp).toDate() : new Date(dateValue);
    return format(date, 'dd MMM yyyy', { locale: es });
  };

  return (
    <div className="container mx-auto py-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold font-headline text-primary flex items-center gap-2"><Droplets />Registro de Cambios de Aceite</h1>
                <p className="text-muted-foreground">Añade y consulta el historial de cambios de aceite de tu vehículo.</p>
            </div>
             <Button variant="ghost" asChild>
                <Link href="/dashboard">Volver al Panel</Link>
            </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Añadir Nuevo Registro</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="oilType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Aceite</FormLabel>
                        <FormControl><Input placeholder="Ej: 10W-40 Sintético" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="oilPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Precio del Aceite ($)</FormLabel>
                        <FormControl><Input type="number" step="0.01" placeholder="75.00" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="mileage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kilometraje Actual (km)</FormLabel>
                        <FormControl><Input type="number" placeholder="150000" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nextChangeMileage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Próximo Cambio (km)</FormLabel>
                        <FormControl><Input type="number" placeholder="160000" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <PlusCircle className="mr-2" />
                  Guardar Registro
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Historial de Cambios</CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                     <div className="flex h-40 items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Tipo de Aceite</TableHead>
                                <TableHead>Kilometraje</TableHead>
                                <TableHead>Próximo Cambio</TableHead>
                                <TableHead className="text-right">Precio</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {oilChanges && oilChanges.length > 0 ? (
                                oilChanges.map((change) => (
                                    <TableRow key={change.id}>
                                        <TableCell>{formatDate(change.date)}</TableCell>
                                        <TableCell>{change.oilType}</TableCell>
                                        <TableCell>{change.mileage.toLocaleString()} km</TableCell>
                                        <TableCell>{change.nextChangeMileage.toLocaleString()} km</TableCell>
                                        <TableCell className="text-right">${change.oilPrice.toFixed(2)}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">
                                        No hay registros de cambios de aceite.
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
