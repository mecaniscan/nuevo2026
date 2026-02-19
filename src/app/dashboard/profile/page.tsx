'use client';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useFirestore, useMemoFirebase, useDoc, FirestorePermissionError, errorEmitter } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';
import Link from 'next/link';
import type { User } from '@/lib/types';
import { updateProfile } from 'firebase/auth';

const profileSchema = z.object({
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres.'),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres.'),
  email: z.string().email('El correo electrónico no es válido.').optional(),
  whatsappNumber: z.string().optional(),
});

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Redirect anonymous users
  useEffect(() => {
    if (!isUserLoading && user?.isAnonymous) {
      toast({
        title: 'Función no disponible para invitados',
        description: 'Por favor, crea una cuenta para tener un perfil.',
        variant: 'destructive',
      });
      router.push('/dashboard');
    }
  }, [isUserLoading, user, router, toast]);

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc<User>(userDocRef);

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      whatsappNumber: '',
    },
  });

  useEffect(() => {
    if (userData) {
      form.reset({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        email: user?.email || userData.email || '',
        whatsappNumber: userData.whatsappNumber || '',
      });
    } else if (user && !isUserDataLoading) {
      const [firstName, lastName] = user.displayName?.split(' ') || ['', ''];
      form.reset({
        firstName: firstName || '',
        lastName: lastName || '',
        email: user.email || '',
        whatsappNumber: '',
      });
    }
  }, [userData, user, isUserDataLoading, form]);

  async function onSubmit(values: z.infer<typeof profileSchema>) {
    if (!user || !firestore || user.isAnonymous) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo actualizar el perfil.',
      });
      return;
    }

    setIsSubmitting(true);
    
    const userRef = doc(firestore, 'users', user.uid);
    const { email, ...dataToUpdate } = values;
    const newDisplayName = `${values.firstName} ${values.lastName}`;

    const firestorePromise = updateDoc(userRef, dataToUpdate);
    const authProfilePromise = user.displayName !== newDisplayName 
      ? updateProfile(user, { displayName: newDisplayName })
      : Promise.resolve();

    Promise.all([firestorePromise, authProfilePromise])
      .then(() => {
          toast({
              title: '¡Perfil Actualizado!',
              description: 'Tu información ha sido guardada correctamente.',
          });
          router.push('/dashboard');
      })
      .catch(() => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: `users/${user.uid}`,
              operation: 'update',
              requestResourceData: dataToUpdate
          }));
      })
      .finally(() => {
          setIsSubmitting(false);
      });
  }
  
  const isLoading = isUserLoading || isUserDataLoading;

  if (isLoading || (user && user.isAnonymous)) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;
  }

  if (!user) {
    return (
      <div className="container mx-auto py-12 flex items-center justify-center">
        <Card className="w-full max-w-lg text-center">
            <CardHeader>
                <CardTitle>Acceso Restringido</CardTitle>
                <CardDescription>Debes iniciar sesión para ver tu perfil.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Button asChild><Link href="/dashboard">Ir a Iniciar Sesión</Link></Button>
            </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary">Editar Perfil</CardTitle>
          <CardDescription>
            Actualiza tu información personal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Tu nombre" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apellido</FormLabel>
                      <FormControl>
                        <Input placeholder="Tu apellido" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
               <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo Electrónico</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} value={field.value || ''} readOnly disabled className="cursor-not-allowed bg-muted/50" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
               <FormField
                  control={form.control}
                  name="whatsappNumber"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>WhatsApp (Opcional)</FormLabel>
                      <FormControl>
                          <Input type="tel" placeholder="+54 9 11 1234-5678" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
                  />
               <div className="flex gap-4 pt-4 border-t">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2" />
                    Guardar Cambios
                  </Button>
                   <Button variant="ghost" asChild>
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