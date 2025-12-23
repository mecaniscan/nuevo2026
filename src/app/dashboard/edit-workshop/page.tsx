'use client';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, query, where, doc } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Loader2, Car, Wrench } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';
import type { Workshop, Service } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';

const workshopSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres.'),
  address: z.string().min(5, 'La dirección debe tener al menos 5 caracteres.'),
  contactNumber: z.string().min(8, 'El número de contacto no es válido.'),
  email: z.string().email('El correo electrónico no es válido.'),
  obdScannerService: z.boolean().default(false),
  serviceIds: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: 'Debes seleccionar al menos un servicio.',
  }),
});

export default function EditWorkshopPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Fetch Master Services List
  const servicesCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'services');
  }, [firestore]);
  const { data: masterServices, isLoading: isServicesLoading } = useCollection<Service>(servicesCollection);

  // Fetch User's Workshop
  const workshopsCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'workshops');
  }, [firestore]);

  const userWorkshopsQuery = useMemoFirebase(() => {
    if (!workshopsCollection || !user) return null;
    return query(workshopsCollection, where('ownerId', '==', user.uid));
  }, [workshopsCollection, user]);

  const { data: workshops, isLoading: isWorkshopsLoading } = useCollection<Workshop>(userWorkshopsQuery);
  const workshop = workshops?.[0];

  const form = useForm<z.infer<typeof workshopSchema>>({
    resolver: zodResolver(workshopSchema),
    defaultValues: {
      name: '',
      description: '',
      address: '',
      contactNumber: '',
      email: '',
      obdScannerService: false,
      serviceIds: [],
    },
  });

  useEffect(() => {
    if (workshop) {
      form.reset({
        ...workshop,
        serviceIds: workshop.serviceIds || [],
      });
    }
  }, [workshop, form]);

  async function onSubmit(values: z.infer<typeof workshopSchema>) {
    if (!user || !firestore || !workshop) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo encontrar el taller para actualizar.',
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const workshopRef = doc(firestore, 'workshops', workshop.id);
      updateDocumentNonBlocking(workshopRef, values);

      toast({
        title: '¡Taller Actualizado!',
        description: 'La información de tu taller ha sido guardada.',
      });
      router.push('/dashboard');
    } catch (error) {
      console.error('Error updating workshop:', error);
      toast({
        variant: 'destructive',
        title: 'Error Inesperado',
        description: 'No se pudo actualizar el taller. Por favor, intenta de nuevo.',
      });
      setIsSubmitting(false);
    }
  }
  
  if (isUserLoading || isWorkshopsLoading || isServicesLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;
  }

  if (!user) {
    return (
      <div className="container mx-auto py-12 flex items-center justify-center">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Acceso Restringido</CardTitle>
            <CardDescription>Debes iniciar sesión para poder editar un taller.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/">Volver al Inicio</Link>
            </Button>
          </CardContent>
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
            <CardDescription>Para editar un taller, primero debes registrar uno.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button asChild>
              <Link href="/dashboard/register-workshop">Registrar Taller</Link>
            </Button>
             <Button asChild variant="secondary">
                <Link href="/dashboard">Ir al Panel de Control</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary">Editar tu Taller</CardTitle>
          <CardDescription>
            Actualiza la información y los servicios de tu taller para mantener a tus clientes informados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Taller</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Taller Mecánico 'El Rápido'" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción del Taller</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe los servicios que ofreces, tu especialidad, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección</FormLabel>
                    <FormControl>
                      <Input placeholder="Calle Falsa 123, Springfield" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField
                  control={form.control}
                  name="contactNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Contacto</FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="+54 11 1234-5678" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo Electrónico de Contacto</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="contacto@tallerelrapido.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
               <FormField
                  control={form.control}
                  name="serviceIds"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel className="text-base font-semibold flex items-center gap-2">
                          <Wrench /> Servicios Ofrecidos
                        </FormLabel>
                        <FormDescription>
                          Selecciona todos los servicios que tu taller proporciona.
                        </FormDescription>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {masterServices?.map((service) => (
                          <FormField
                            key={service.id}
                            control={form.control}
                            name="serviceIds"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={service.id}
                                  className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 transition-colors hover:bg-accent/50 has-[:checked]:bg-accent/80"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(service.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...(field.value || []), service.id])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== service.id
                                              )
                                            )
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal w-full cursor-pointer">
                                    {service.name}
                                    <p className="text-xs text-muted-foreground">${service.price}</p>
                                  </FormLabel>
                                </FormItem>
                              )
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              <FormField
                control={form.control}
                name="obdScannerService"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base flex items-center gap-2">
                        <Car /> Servicio de Escáner OBD-II
                      </FormLabel>
                      <FormDescription>
                        Marca esta casilla si tu taller ofrece servicios de diagnóstico con escáner OBD-II.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
               <div className="flex gap-4">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                  </Button>
                   <Button variant="outline" asChild>
                    <Link href="/dashboard">Cancelar</Link>
                  </Button>
               </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

    