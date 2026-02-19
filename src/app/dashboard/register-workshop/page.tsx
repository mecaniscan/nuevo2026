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
import { useUser, useFirestore, useMemoFirebase, useStorage, FirestorePermissionError, errorEmitter, useCollection } from '@/firebase';
import { collection, query, where, doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Loader2, Building, Wrench } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';
import type { Workshop } from '@/lib/types';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

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
    .refine((files) => !files || files.length === 0 || files.length === 1, "Solo puedes subir una foto.")
    .refine((files) => !files || files.length === 0 || files?.[0]?.size <= MAX_FILE_SIZE, `El tamaño máximo de la imagen es 10MB.`)
    .refine(
      (files) => !files || files.length === 0 || ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type),
      "Solo se aceptan formatos .jpg, .jpeg, .png y .webp."
    ).optional(),
});

export default function RegisterWorkshopPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const userWorkshopsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, 'workshops'), where('ownerId', '==', user.uid));
  }, [firestore, user?.uid]);

  const { data: workshops, isLoading: isWorkshopsLoading } = useCollection<Workshop>(userWorkshopsQuery);

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

  const uploadImage = async (file: File): Promise<string> => {
    if (!storage || !user) {
        throw new Error("Servicio de almacenamiento no disponible.");
    }
    const metadata = {
      contentType: file.type || 'image/jpeg',
    };
    // Ensure the path matches workshops/{uid}/{filename}
    const imagePath = `workshops/${user.uid}/${uuidv4()}`;
    const imageRef = storageRef(storage, imagePath);
    const snapshot = await uploadBytes(imageRef, file, metadata);
    return getDownloadURL(snapshot.ref);
  };

  async function onSubmit(values: z.infer<typeof workshopSchema>) {
    if (!user || !firestore || user.isAnonymous) {
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
      let imageUrl = '';
      if (values.image && values.image.length > 0) {
        imageUrl = await uploadImage(values.image[0]);
      }
      
      const workshopRef = doc(collection(firestore, 'workshops'));
      const { image, ...dataToSave } = values;

      const workshopData = {
        ...dataToSave,
        id: workshopRef.id,
        ownerId: user.uid,
        imageUrl,
        latitude: 0, 
        longitude: 0,
        averageRating: 0,
        reviewCount: 0,
      };
      
      setDoc(workshopRef, workshopData)
        .then(() => {
            toast({
                title: '¡Taller Registrado!',
                description: 'Tu taller ha sido añadido a nuestra plataforma.',
            });
            router.push('/dashboard/edit-services');
        })
        .catch((e: any) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: workshopRef.path,
                operation: 'create',
                requestResourceData: workshopData
            }));
        })
        .finally(() => {
            setIsSubmitting(false);
        });

    } catch (error: any) {
        toast({ 
            variant: 'destructive', 
            title: 'Error de subida', 
            description: error.message || 'No se pudo subir la imagen del taller.' 
        });
        setIsSubmitting(false);
    }
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
            <CardDescription>Debes iniciar sesión para poder registrar un taller.</CardDescription>
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
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary">Registra tu Taller</CardTitle>
          <CardDescription>
            Completa el siguiente formulario para añadir tu taller a MecaniScan.
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
                      <Input placeholder="Ej: Taller Mecánico 'El Rápido'" {...field} value={field.value ?? ''} />
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
                      <Textarea placeholder="Describe los servicios que ofreces, tu especialidad, etc." {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="image"
                render={({ field: { onChange } }) => (
                  <FormItem>
                    <FormLabel>Foto del Taller (Opcional)</FormLabel>
                    <FormControl>
                      <Input type="file" accept="image/*" onChange={(e) => onChange(e.target.files)} />
                    </FormControl>
                    <FormDescription>Sube una imagen principal (máx 10MB).</FormDescription>
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
                      <Input placeholder="Calle Falsa 123, Springfield" {...field} value={field.value ?? ''} />
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
                        <Input type="tel" placeholder="+54 11 1234-5678" {...field} value={field.value ?? ''} />
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
                        <Input type="tel" placeholder="+54 9 11 1234-5678" {...field} value={field.value ?? ''} />
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
                        <Input type="email" placeholder="contacto@tallerelrapido.com" {...field} value={field.value ?? ''} />
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
                        <Wrench/> Servicio de Escáner OBD-II
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
