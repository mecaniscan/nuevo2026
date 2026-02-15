'use client';
import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useFirestore, useMemoFirebase, FirestorePermissionError, errorEmitter, useDoc, useStorage } from '@/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Car, Briefcase, BadgePercent, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { Vehicle, User } from '@/lib/types';
import { useRouter, useSearchParams } from 'next/navigation';
import { Switch } from '@/components/ui/switch';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { getPlaceholderImage } from '@/lib/placeholder-images';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { countries, carBrands } from '@/lib/data';

function RegisterVehicleForm() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editingVehicleId = searchParams.get('edit');

  useEffect(() => {
    if (!isUserLoading && !user) {
        router.push('/login');
    }
  }, [isUserLoading, user, router]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const backgroundImage = getPlaceholderImage('vehicle-registration-background');
  
  // Fetch the specific vehicle being edited
  const vehicleDocRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid || !editingVehicleId) return null;
    return doc(firestore, `users/${user.uid}/vehicles`, editingVehicleId);
  }, [firestore, user?.uid, editingVehicleId]);
  const { data: editingVehicle, isLoading: isEditingVehicleLoading } = useDoc<Vehicle>(vehicleDocRef);

  // Still need the collection ref for creating new vehicles
  const vehiclesCollectionRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, `users/${user.uid}/vehicles`);
  }, [firestore, user?.uid]);

  const vehicleSchema = useMemo(() => z.object({
    type: z.string().optional(),
    brand: z.string({ required_error: 'La marca es obligatoria.' }),
    model: z.string().min(1, 'El modelo es obligatorio.'),
    year: z.preprocess(
      (a) => a ? parseInt(z.string().parse(a), 10) : new Date().getFullYear(),
      z.number().min(1900, 'El año no es válido.').max(new Date().getFullYear() + 1, 'El año no es válido.')
    ),
    vin: z.string().optional(),
    licensePlate: z.string().optional(),
    price: z.preprocess(
        (a) => (a !== '' && a !== null && a !== undefined) ? parseFloat(z.string().parse(String(a))) : null,
        z.number().nullable().optional()
    ),
    currentMileage: z.preprocess(
      (a) => a ? parseInt(z.string().parse(a), 10) : 0,
      z.number().optional()
    ),
    country: z.string({ required_error: 'El país es obligatorio.' }),
    isForSale: z.boolean().default(false),
    images: z.any().optional(),
  }).refine(data => {
      if (data.isForSale) {
        // When editing, if there are existing images and no new ones are uploaded, validation passes.
        if (editingVehicle && editingVehicle.imageUrls && editingVehicle.imageUrls.length > 0 && (!data.images || data.images.length === 0)) {
            return true;
        }
        // When creating, or when new images are uploaded during edit, we check the new files.
        return data.images && data.images.length > 0 && data.images.length <= 3;
      }
      return true;
  }, {
      message: "Debes subir entre 1 y 3 imágenes para publicar en el marketplace.",
      path: ["images"],
  }).refine(data => {
      if (data.isForSale) {
          return data.price != null && data.price > 0;
      }
      return true;
  }, {
      message: "El precio es obligatorio para poner el vehículo a la venta.",
      path: ["price"],
  }), [editingVehicle]);

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);
  const { data: userData, isLoading: isUserDataLoading } = useDoc<User>(userDocRef);

  const form = useForm<z.infer<typeof vehicleSchema>>({
    resolver: zodResolver(vehicleSchema),
    mode: 'onChange',
    defaultValues: {
      type: '',
      brand: '',
      model: '',
      year: new Date().getFullYear(),
      vin: '',
      licensePlate: '',
      price: null,
      currentMileage: 0,
      country: '',
      isForSale: false,
      images: undefined,
    },
  });
  
  const { watch } = form;
  const isForSale = watch("isForSale");
  const imageFieldValue = watch('images');

  useEffect(() => {
    if (editingVehicle) {
      form.reset({
        ...editingVehicle,
        price: editingVehicle.price ?? null,
        images: undefined,
      });
      setImagePreviews(editingVehicle.imageUrls || []);
    }
  }, [editingVehicle, form]);

  useEffect(() => {
    let objectUrls: string[] = [];
    
    if (imageFieldValue instanceof FileList && imageFieldValue.length > 0) {
        objectUrls = Array.from(imageFieldValue).map(file => URL.createObjectURL(file));
        setImagePreviews(objectUrls);
    }

    return () => {
        objectUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [imageFieldValue]);


  const uploadImages = async (files: FileList): Promise<string[]> => {
    if (!storage || !user) {
        throw new Error("Storage service not available.");
    }
    const uploadPromises = Array.from(files).map(file => {
        const imageRef = storageRef(storage, `vehicles/${user.uid}/${uuidv4()}`);
        return uploadBytes(imageRef, file).then(snapshot => getDownloadURL(snapshot.ref));
    });
    return Promise.all(uploadPromises);
  };

  async function onSubmit(values: z.infer<typeof vehicleSchema>) {
    if (!user || !firestore || !userData || !vehiclesCollectionRef) {
      toast({ variant: 'destructive', title: 'Error', description: 'Debes iniciar sesión.' });
      return;
    }
  
    setIsSubmitting(true);
  
    try {
      let finalImageUrls: string[] = editingVehicle?.imageUrls || [];
  
      if (values.images instanceof FileList && values.images.length > 0) {
        finalImageUrls = await uploadImages(values.images);
      } else if (!values.isForSale) {
        finalImageUrls = [];
      }
  
      const vehicleId = editingVehicleId || doc(vehiclesCollectionRef).id;
      const { images, ...formValues } = values;
  
      const vehiclePayload: Vehicle = {
        id: vehicleId,
        userId: user.uid,
        type: formValues.type || '',
        brand: formValues.brand,
        model: formValues.model,
        year: formValues.year,
        vin: formValues.vin || '',
        licensePlate: formValues.licensePlate || '',
        price: formValues.price,
        currentMileage: formValues.currentMileage || 0,
        isForSale: formValues.isForSale || false,
        country: formValues.country,
        imageUrls: finalImageUrls,
        sellerName: `${userData.firstName} ${userData.lastName}`,
        sellerWhatsapp: userData.whatsappNumber || '',
        certificateNumber: editingVehicle?.certificateNumber || uuidv4(),
      };
  
      const batch = writeBatch(firestore);
      const userVehicleRef = doc(vehiclesCollectionRef, vehicleId);
      batch.set(userVehicleRef, vehiclePayload, { merge: true });

      const marketplaceRef = doc(firestore, 'marketplace', vehicleId);

      if (vehiclePayload.isForSale) {
        batch.set(marketplaceRef, vehiclePayload, { merge: true });
      } else {
        if(editingVehicleId) { // only delete from marketplace if it existed before
           batch.delete(marketplaceRef);
        }
      }
      
      batch.commit()
        .then(() => {
          toast({
            title: editingVehicleId ? '¡Vehículo Actualizado!' : '¡Vehículo Añadido!',
            description: `Tu vehículo ha sido ${editingVehicleId ? 'actualizado' : 'guardado'}.`,
          });
          router.push('/dashboard/my-vehicles');
        })
        .catch(() => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: editingVehicleId ? `users/${user.uid}/vehicles/${editingVehicleId}` : `users/${user.uid}/vehicles`,
              operation: editingVehicleId ? 'update' : 'create',
              requestResourceData: vehiclePayload,
          }));
        })
        .finally(() => {
            setIsSubmitting(false);
        });

    } catch (error: any) {
      console.error("Error during image upload or processing:", error);
      toast({
          variant: 'destructive',
          title: 'Error de Envío',
          description: 'No se pudo procesar la solicitud. Por favor, intente de nuevo.',
      });
      setIsSubmitting(false);
    }
  }

  const isLoading = isUserLoading || isUserDataLoading || (!!editingVehicleId && isEditingVehicleLoading);
  
  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-background p-4">
       {backgroundImage && (
            <Image
                src={backgroundImage.imageUrl}
                alt={backgroundImage.description}
                fill
                className="absolute inset-0 z-0 object-cover"
                priority
                data-ai-hint={backgroundImage.imageHint}
            />
       )}
       <div className="absolute inset-0 z-10 bg-black/70 backdrop-blur-sm" />
      <Card className="z-20 w-full max-w-2xl shadow-2xl bg-black/30 border-white/20 text-white">
        <CardHeader>
            <CardTitle className="text-3xl font-headline text-primary flex items-center justify-between">
                {editingVehicleId ? 'Editar Vehículo' : 'Registrar Nuevo Vehículo'}
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/dashboard/my-vehicles"><ArrowLeft className="mr-2"/> Volver</Link>
                </Button>
            </CardTitle>
            <CardDescription className="text-white/80">
                {editingVehicleId ? 'Actualiza los detalles de tu vehículo.' : 'Añade un nuevo vehículo a tu garaje digital.'}
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                 <div className="space-y-4 pt-4">
                    <FormField
                      control={form.control}
                      name="isForSale"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border border-white/30 p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base flex items-center gap-2 text-white">
                              <Briefcase /> Poner a la Venta
                            </FormLabel>
                            <FormDescription className="text-white/70">
                              Marca esta casilla para listar este vehículo en el Marketplace.
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <FormField control={form.control} name="brand" render={({ field }) => (<FormItem><FormLabel>Marca</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="bg-transparent text-white"><SelectValue placeholder="Selecciona una marca" /></SelectTrigger></FormControl><SelectContent>{carBrands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="model" render={({ field }) => (<FormItem><FormLabel>Modelo</FormLabel><FormControl><Input placeholder="Ej: Corolla" {...field} className="bg-transparent text-white" /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="type" render={({ field }) => (<FormItem><FormLabel>Tipo</FormLabel><FormControl><Input placeholder="Ej: Sedan, SUV" {...field} className="bg-transparent text-white" /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="year" render={({ field }) => (<FormItem><FormLabel>Año</FormLabel><FormControl><Input type="number" placeholder="2022" {...field} className="bg-transparent text-white" /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="currentMileage" render={({ field }) => (<FormItem><FormLabel>Kilometraje Actual</FormLabel><FormControl><Input type="number" placeholder="50000" {...field} className="bg-transparent text-white" /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="licensePlate" render={({ field }) => (<FormItem><FormLabel>Placa</FormLabel><FormControl><Input placeholder="ABC-123" {...field} className="bg-transparent text-white" /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="country" render={({ field }) => (<FormItem><FormLabel>País</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="bg-transparent text-white"><SelectValue placeholder="Selecciona un país" /></SelectTrigger></FormControl><SelectContent>{countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                    <div className="lg:col-span-2">
                        <FormField control={form.control} name="vin" render={({ field }) => (<FormItem><FormLabel>Código VIN (Opcional)</FormLabel><FormControl><Input placeholder="17 caracteres" {...field} className="bg-transparent text-white"/></FormControl><FormMessage /></FormItem>)} />
                    </div>
                 
                  {isForSale && (
                    <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        <FormField control={form.control} name="price" render={({ field }) => (<FormItem><FormLabel>Precio ($)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="25000.00" {...field} value={field.value ?? ''} className="bg-transparent text-white" /></FormControl><FormMessage /></FormItem>)} />
                        <div className='space-y-2'>
                          <FormField
                            control={form.control}
                            name="images"
                            render={({ field: { onChange, value, ...rest } }) => (
                                <FormItem>
                                <FormLabel>Imágenes del Vehículo (hasta 3)</FormLabel>
                                <FormControl>
                                    <Input type="file" accept="image/*" multiple onChange={(e) => onChange(e.target.files)} className="bg-transparent text-white file:text-white" />
                                </FormControl>
                                <FormMessage className='text-red-400' />
                                </FormItem>
                            )}
                            />
                            {imagePreviews.length > 0 && (
                            <div className="mt-4">
                                <FormLabel>Vista Previa</FormLabel>
                                <Carousel className="w-full max-w-xs mx-auto mt-2">
                                    <CarouselContent>
                                    {imagePreviews.map((src, index) => (
                                        <CarouselItem key={index}>
                                        <div className="p-1">
                                            <Card>
                                            <CardContent className="flex aspect-video items-center justify-center p-0 relative overflow-hidden rounded-md">
                                                <Image src={src} alt={`Vista previa ${index + 1}`} fill className="object-cover"/>
                                            </CardContent>
                                            </Card>
                                        </div>
                                        </CarouselItem>
                                    ))}
                                    </CarouselContent>
                                    <CarouselPrevious />
                                    <CarouselNext />
                                </Carousel>
                            </div>
                            )}
                        </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-4 pt-6 border-t border-white/20">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingVehicleId ? <>Guardar Cambios</> : <><PlusCircle className="mr-2" /> Guardar Vehículo</>}
                  </Button>
                </div>
              </form>
            </Form>
        </CardContent>
      </Card>
    </div>
  );
}


export default function RegisterVehiclePage() {
    return (
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <RegisterVehicleForm />
        </Suspense>
    )
}
