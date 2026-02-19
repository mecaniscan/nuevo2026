
'use client';
import React, { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useFirestore, useMemoFirebase, useCollection, FirestorePermissionError, errorEmitter } from '@/firebase';
import { collection, query, where, doc, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Loader2, PlusCircle, Trash2, AlertCircle, Save } from 'lucide-react';
import Link from 'next/link';
import type { Workshop, Service } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const serviceSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  description: z.string().optional(),
  price: z.coerce.number({ invalid_type_error: 'El precio debe ser un número.' }).positive('El precio debe ser un número positivo.'),
});

const formSchema = z.object({
  services: z.array(serviceSchema).max(3, 'Solo puedes tener un máximo de 3 servicios.'),
});

export default function EditServicesPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const userWorkshopsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, 'workshops'), where('ownerId', '==', user.uid));
  }, [firestore, user?.uid]);

  const { data: workshops, isLoading: isWorkshopsLoading } = useCollection<Workshop>(userWorkshopsQuery);
  const workshop = workshops?.[0];
  
  const servicesCollectionRef = useMemoFirebase(() => {
    if (!firestore || !workshop) return null;
    return collection(firestore, `workshops/${workshop.id}/services`);
  }, [firestore, workshop]);

  const { data: currentServices, isLoading: isServicesLoading } = useCollection<Service>(servicesCollectionRef);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      services: [],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "services"
  });

  useEffect(() => {
    if (currentServices && currentServices.length > 0) {
      const sanitizedServices = currentServices.map(s => ({
        id: s.id,
        name: s.name || '',
        description: s.description || '',
        price: s.price || 0,
      }));
      replace(sanitizedServices);
    }
  }, [currentServices, replace]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !firestore || !workshop) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo encontrar el taller.' });
      return;
    }
    
    setIsSubmitting(true);
    
    const batch = writeBatch(firestore);
    const servicesColRef = collection(firestore, `workshops/${workshop.id}/services`);
    
    const formIds = new Set(values.services.map(s => s.id).filter(Boolean));

    currentServices?.forEach(serviceInDb => {
      if (!formIds.has(serviceInDb.id)) {
          const docRef = doc(servicesColRef, serviceInDb.id);
          batch.delete(docRef);
      }
    });
    
    values.services.forEach(service => {
      const docRef = service.id ? doc(servicesColRef, service.id) : doc(servicesColRef);
      const { id, ...serviceData } = service; 
      batch.set(docRef, { ...serviceData, id: docRef.id }, { merge: true });
    });

    batch.commit().then(() => {
        toast({
            title: '¡Servicios Actualizados!',
            description: 'Tu lista de servicios ha sido guardada.',
        });
        router.push('/dashboard');
    }).catch((err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `workshops/${workshop.id}/services`,
            operation: 'write',
            requestResourceData: values.services
        }));
    }).finally(() => {
        setIsSubmitting(false);
    });
  }

  const isLoading = isUserLoading || isWorkshopsLoading || isServicesLoading;

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;
  }

  if (!user) {
    return (
      <div className="container mx-auto py-12 flex items-center justify-center">
        <Card className="w-full max-w-lg">
          <CardHeader><CardTitle>Acceso Restringido</CardTitle></CardHeader>
          <CardContent><Button asChild><Link href="/dashboard">Ir a Iniciar Sesión</Link></Button></CardContent>
        </Card>
      </div>
    );
  }

  if (!workshop) {
     return (
      <div className="container mx-auto py-12 flex items-center justify-center">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <CardTitle>No tienes un taller registrado</CardTitle>
            <CardDescription>Para gestionar servicios, primero debes registrar un taller.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button asChild><Link href="/dashboard/register-workshop">Registrar Taller</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-12 px-4">
        <Card className="max-w-4xl mx-auto shadow-xl border-primary/20">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-2xl font-headline text-primary">Gestionar Servicios de "{workshop.name}"</CardTitle>
                    <CardDescription>
                        Define los servicios principales que ofreces. Máximo 3 por taller.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-lg py-1 px-3">
                    {fields.length} / 3
                  </Badge>
                </div>
            </CardHeader>
            <CardContent className="pt-8">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        {fields.length >= 3 && (
                            <Alert variant="default" className="border-orange-500 bg-orange-500/10 text-orange-500">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Límite Alcanzado</AlertTitle>
                                <AlertDescription>
                                    Has alcanzado el máximo de 3 servicios permitidos.
                                </AlertDescription>
                            </Alert>
                        )}
                        
                        <div className="space-y-6">
                            {fields.map((field, index) => (
                                <Card key={field.id} className="p-4 relative border-primary/10 bg-card/30 group hover:border-primary/30 transition-colors">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-10">
                                        <FormField
                                            control={form.control}
                                            name={`services.${index}.name`}
                                            render={({ field }) => (
                                                <FormItem>
                                                <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nombre del Servicio</FormLabel>
                                                <FormControl><Input placeholder="Ej: Cambio de Aceite" {...field} value={field.value || ''} className="bg-background/50" /></FormControl>
                                                <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name={`services.${index}.price`}
                                            render={({ field }) => (
                                                <FormItem>
                                                <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Precio ($)</FormLabel>
                                                <FormControl><Input type="number" step="0.01" placeholder="50.00" {...field} value={field.value || ''} className="bg-background/50" /></FormControl>
                                                <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <div className="md:col-span-2">
                                            <FormField
                                                control={form.control}
                                                name={`services.${index}.description`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descripción (Opcional)</FormLabel>
                                                    <FormControl><Textarea rows={2} placeholder="Describe brevemente el servicio." {...field} value={field.value || ''} className="bg-background/50" /></FormControl>
                                                    <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>
                                    <Button 
                                      type="button" 
                                      variant="ghost" 
                                      size="icon" 
                                      className="absolute top-4 right-4 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" 
                                      onClick={() => remove(index)}
                                    >
                                        <Trash2 className="h-5 w-5" />
                                        <span className="sr-only">Eliminar servicio</span>
                                    </Button>
                                </Card>
                            ))}
                        </div>

                        {fields.length < 3 && (
                          <Button 
                              type="button" 
                              variant="outline" 
                              className="w-full border-dashed border-2 py-8 hover:bg-primary/5 hover:border-primary/30 transition-all"
                              onClick={() => append({ name: '', description: '', price: 10 })}
                          >
                              <PlusCircle className="mr-2 h-5 w-5" />
                              Añadir Nuevo Servicio
                          </Button>
                        )}
                        
                        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
                            <Button 
                                type="submit" 
                                className="flex-1 h-12 text-lg font-bold" 
                                disabled={isSubmitting || !form.formState.isDirty}
                            >
                                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                                {isSubmitting ? 'Guardando...' : 'Guardar Todos los Cambios'}
                            </Button>
                            <Button variant="ghost" className="h-12" asChild>
                                <Link href="/dashboard">Volver al Panel</Link>
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    </div>
  )
}
