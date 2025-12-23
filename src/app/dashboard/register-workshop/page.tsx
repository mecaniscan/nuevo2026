'use client';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, query, where } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Loader2, Car, Wrench } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';
import type { Workshop } from '@/lib/types';

const workshopSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres.'),
  address: z.string().min(5, 'La dirección debe tener al menos 5 caracteres.'),
  contactNumber: z.string().min(8, 'El número de contacto no es válido.'),
  email: z.string().email('El correo electrónico no es válido.'),
  obdScannerService: z.boolean().default(false),
});

export default function RegisterWorkshopPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Fetch User's Workshops
  const workshopsCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'workshops');
  }, [firestore]);

  const userWorkshopsQuery = useMemoFirebase(() => {
    if (!workshopsCollection || !user) return null;
    return query(workshopsCollection, where('ownerId', '==', user.uid));
  }, [workshopsCollection, user]);

  const { data: workshops, isLoading: isWorkshopsLoading } = useCollection<Workshop>(userWorkshopsQuery);

  const form = useForm<z.infer<typeof workshopSchema>>({
    resolver: zodResolver(workshopSchema),
    defaultValues: {
      name: '',
      description: '',
      address: '',
      contactNumber: '',
      email: '',
      obdScannerService: false,
    },
  });

  async function onSubmit(values: z.infer<typeof workshopSchema>) {
    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Debes iniciar sesión para registrar un taller.',
      });
      return;
    }

    if (workshops && workshops.length > 0) {
      toast({
        variant: 'destructive',
        title: 'Límite alcanzado',
        description: 'Ya has registrado un taller. Solo puedes tener uno.',
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const workshopData = {
        ...values,
        ownerId: user.uid,
        latitude: 0, 
        longitude: 0,
        averageRating: 0,
        reviewCount: 0,
      };
      
      const docRef = await addDocumentNonBlocking(collection(firestore, 'workshops'), workshopData);

      toast({
        title: '¡Taller Registrado!',
        description: 'Tu taller ha sido añadido a nuestra plataforma.',
      });
      router.push('/dashboard/edit-services');
    } catch (error) {
      console.error('Error registering workshop:', error);
      toast({
        variant: 'destructive',
        title: 'Error Inesperado',
        description: 'No se pudo registrar el taller. Por favor, intenta de nuevo.',
      });
      setIsSubmitting(false);
    }
  }
  
  if (isUserLoading || isWorkshopsLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;
  }

  if (!user) {
    return (
      <div className="container mx-auto py-12 flex items-center justify-center">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Acceso Restringido</CardTitle>
            <CardDescription>Debes iniciar sesión para poder registrar un taller.</CardDescription>
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

  if (workshops && workshops.length > 0) {
     return (
      <div className="container mx-auto py-12 flex items-center justify-center">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <CardTitle>Ya tienes un taller registrado</CardTitle>
            <CardDescription>Solo puedes registrar un taller por cuenta. Puedes gestionar tu taller existente desde el panel de control.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
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
          <CardTitle className="text-2xl font-headline text-primary">Registra tu Taller</CardTitle>
          <CardDescription>
            Completa el siguiente formulario para añadir tu taller a MechConnect y llegar a más clientes.
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
                name="obdScannerService"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base flex items-center gap-2">
                        <Car/> Servicio de Escáner OBD-II
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Registrando...' : 'Registrar y Añadir Servicios'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

    