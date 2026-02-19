'use client';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useFirestore, useMemoFirebase, useStorage, errorEmitter, FirestorePermissionError, useCollection } from '@/firebase';
import { collection, query, where, doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Loader2, Car, Wrench } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';
import type { Workshop } from '@/lib/types';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const workshopSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres.'),
  address: z.string().min(5, 'La dirección debe tener al menos 5 caracteres.'),
  contactNumber: z.string().min(8, 'El número de contacto no es válido.'),
  whatsappNumber: z.string().optional(),
  email: z.string().email('El correo electrónico no es válido.'),
  obdScannerService: z.boolean().default(false),
  image: z.any()
    .refine((files) => !files || files.length === 0 || files?.length === 1, "Solo puedes subir una imagen.")
    .refine((files) => !files || files.length === 0 || files?.[0]?.size <= MAX_FILE_SIZE, `El tamaño máximo es 10MB.`)
    .refine(
      (files) => !files || files.length === 0 || ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type),
      "Solo se aceptan formatos .jpg, .jpeg, .png y .webp."
    ).optional(),
});

export default function EditWorkshopPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect anonymous users
  useEffect(() => {
    if (!isUserLoading && user?.isAnonymous) {
      toast({
        title: 'Función no disponible para invitados',
        description: 'Por favor, crea una cuenta para editar un taller.',
        variant: 'destructive',
      });
      router.push('/dashboard');
    }
  }, [isUserLoading, user, router, toast]);

  // Fetch User's Workshop
  const userWorkshopsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, 'workshops'), where('ownerId', '==', user.uid));
  }, [firestore, user?.uid]);

  const { data: workshops, isLoading: isWorkshopsLoading } = useCollection<Workshop>(userWorkshopsQuery);
  const workshop = workshops?.[0];

  const form = useForm<z.infer<typeof workshopSchema>>({
    resolver: zodResolver(workshopSchema),
    defaultValues: {
      name: '',
      description: '',
      address: '',
      contactNumber: '',
      whatsappNumber: '',
      email: '',
      obdScannerService: false,
    },
  });

  useEffect(() => {
    if (workshop) {
      form.reset({
        name: workshop.name || '',
        description: workshop.description || '',
        address: workshop.address || '',
        contactNumber: workshop.contactNumber || '',
        whatsappNumber: workshop.whatsappNumber || '',
        email: workshop.email || '',
        obdScannerService: workshop.obdScannerService || false,
        image: undefined
      });
    }
  }, [workshop, form]);

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!storage || !user) {
        toast({ variant: 'destructive', title: 'Error', description: 'Servicio de almacenamiento no disponible.'})
        return null;
    }
    try {
        const metadata = {
            contentType: file.type || 'image/jpeg',
        };
        const imageRef = storageRef(storage, `workshops/${user.uid}/${uuidv4()}`);
        const snapshot = await uploadBytes(imageRef, file, metadata);
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
    } catch (error) {
        console.error('Error al subir imagen:', error);
        toast({ variant: 'destructive', title: 'Error de Subida', description: 'No se pudo subir la imagen al servidor.'})
        return null;
    }
  };

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
    
    let imageUrl = workshop.imageUrl;
    if (values.image && values.image.length > 0) {
        const newImageUrl = await uploadImage(values.image[0]);
        if (newImageUrl) {
          imageUrl = newImageUrl;
        } else {
          setIsSubmitting(false);
          return;
        }
    }

    const workshopRef = doc(firestore, 'workshops', workshop.id);
    const { image, ...dataToUpdate } = values;
    
    const finalData = { ...dataToUpdate, imageUrl };
    
    updateDoc(workshopRef, finalData)
        .then(() => {
            toast({
                title: '¡Taller Actualizado!',
                description: 'La información de tu taller ha sido guardada.',
            });
            router.push('/dashboard');
        })
        .catch(() => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: workshopRef.path,
                operation: 'update',
                requestResourceData: finalData
            }));
        })
        .finally(() => {
            setIsSubmitting(false);
        });
  }
  
  const isLoading = isUserLoading || isWorkshopsLoading;

  if (isLoading || (user && user.isAnonymous)) {
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
              <Link href="/dashboard">Ir a Iniciar Sesión</Link>
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
                      <Input placeholder="Ej: Taller Mecánico 'El Rápido'" {...field} value={field.value || ''} />
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
                      <Textarea placeholder="Describe los servicios que ofreces, tu especialidad, etc." {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Foto del Taller</FormLabel>
                     {workshop.imageUrl && (
                        <div className="mb-4">
                            <Image src={workshop.imageUrl} alt="Vista previa del taller" width={200} height={150} className="rounded-md object-cover" />
                        </div>
                    )}
                    <FormControl>
                      <Input type="file" accept="image/*" onChange={(e) => field.onChange(e.target.files)} />
                    </FormControl>
                    <FormDescription>Sube una nueva foto para reemplazar la actual (opcional).</FormDescription>
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
                      <Input placeholder="Calle Falsa 123, Springfield" {...field} value={field.value || ''} />
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
                        <Input type="tel" placeholder="+54 11 1234-5678" {...field} value={field.value || ''} />
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
                      <FormLabel>Número de WhatsApp (Opcional)</FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="+54 9 11 1234-5678" {...field} value={field.value || ''} />
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
                        <Input type="email" placeholder="contacto@tallerelrapido.com" {...field} value={field.value || ''} />
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
                        <Wrench /> Servicio de Escáner OBD-II
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