'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useUser, useFirestore, useMemoFirebase, FirestorePermissionError, errorEmitter, useDoc, useStorage } from '@/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, BadgePercent } from 'lucide-react';
import type { Vehicle, User } from '@/lib/types';
import { useRouter, useSearchParams } from 'next/navigation';
import { Switch } from '@/components/ui/switch';
import { v4 as uuidv4 } from 'uuid';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { countries, carBrands } from '@/lib/data';
import Image from 'next/image';

export function VehicleForm() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setCurrentYear(new Date().getFullYear());
  }, []);
  
  const vehicleDocRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid || !editId) return null;
    return doc(firestore, `users/${user.uid}/vehicles`, editId);
  }, [firestore, user?.uid, editId]);
  
  const { data: editingVehicle, isLoading: isEditingVehicleLoading } = useDoc<Vehicle>(vehicleDocRef);

  const vehiclesCollectionRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, `users/${user.uid}/vehicles`);
  }, [firestore, user?.uid]);
  
  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);
  
  const { data: userData, isLoading: isUserDataLoading } = useDoc<User>(userDocRef);
  
  const vehicleSchema = useMemo(() => {
    const yearLimit = currentYear || new Date().getFullYear();
    return z.object({
      type: z.string().optional(),
      brand: z.string({ required_error: 'La marca es obligatoria.' }).min(1, 'La marca es obligatoria.'),
      model: z.string().min(1, 'El modelo es obligatorio.'),
      year: z.coerce.number({invalid_type_error: 'El año debe ser un número.'})
        .min(1900, 'El año no es válido.')
        .max(yearLimit + 2, 'El año no es válido.'),
      vin: z.string().optional(),
      licensePlate: z.string().optional(),
      price: z.coerce.number({invalid_type_error: 'El precio debe ser un número.'}).nullable().optional(),
      currentMileage: z.coerce.number({invalid_type_error: 'El kilometraje debe ser un número.'}).optional().default(0),
      country: z.string({ required_error: 'El país es obligatorio.' }).min(1, 'El país es obligatorio.'),
      isForSale: z.boolean().default(false),
      images: z.any().optional(),
      hasExistingImages: z.boolean().optional(),
    }).refine(data => {
        if (data.isForSale) {
          if (data.hasExistingImages && (!data.images || (data.images instanceof FileList && data.images.length === 0))) {
              return true;
          }
          const imageCount = data.images instanceof FileList ? data.images.length : 0;
          return imageCount > 0 && imageCount <= 3;
        }
        return true;
    }, {
        message: "Debes subir entre 1 y 3 imágenes para el marketplace.",
        path: ["images"],
    }).refine(data => {
        if (data.isForSale) {
            return data.price != null && data.price > 0;
        }
        return true;
    }, {
        message: "El precio es obligatorio para poner el vehículo a la venta.",
        path: ["price"],
    });
  }, [currentYear]);

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
      price: 0,
      currentMileage: 0,
      country: '',
      isForSale: false,
      images: undefined,
      hasExistingImages: false,
    },
  });
  
  const { watch, reset } = form;
  const isForSale = watch("isForSale");

  useEffect(() => {
    if (!isMounted) return;

    if (editingVehicle) {
      reset({
        type: editingVehicle.type || '',
        brand: editingVehicle.brand || '',
        model: editingVehicle.model || '',
        year: editingVehicle.year || currentYear,
        vin: editingVehicle.vin || '',
        licensePlate: editingVehicle.licensePlate || '',
        price: editingVehicle.price ?? 0,
        currentMileage: editingVehicle.currentMileage || 0,
        country: editingVehicle.country || '',
        isForSale: editingVehicle.isForSale || false,
        images: undefined,
        hasExistingImages: !!(editingVehicle.imageUrls && editingVehicle.imageUrls.length > 0)
      });
    }
  }, [editingVehicle, reset, currentYear, isMounted]);

  const uploadImages = async (files: FileList): Promise<string[]> => {
    if (!storage || !user) throw new Error("Servicio de almacenamiento no disponible.");
    const uploadPromises = Array.from(files).map(file => {
        const metadata = { contentType: file.type || 'image/jpeg' };
        const imageRef = storageRef(storage, `vehicles/${user.uid}/${uuidv4()}`);
        return uploadBytes(imageRef, file, metadata).then(snapshot => getDownloadURL(snapshot.ref));
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
      }
  
      const vehicleId = editId || doc(vehiclesCollectionRef).id;
      const { images, hasExistingImages, ...formValues } = values;
  
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
      } else if (editId) { 
        batch.delete(marketplaceRef);
      }
      
      batch.commit()
        .then(() => {
          toast({
            title: editId ? '¡Vehículo Actualizado!' : '¡Vehículo Añadido!',
            description: `Tu vehículo ha sido guardado exitosamente.`,
          });
          router.push('/dashboard/my-vehicles');
        })
        .catch((e: any) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: userVehicleRef.path,
              operation: editId ? 'update' : 'create',
              requestResourceData: vehiclePayload,
          }));
        })
        .finally(() => setIsSubmitting(false));
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error de Almacenamiento', description: error.message || 'Hubo un problema al subir las imágenes.' });
      setIsSubmitting(false);
    }
  }

  const isLoading = !isMounted || isUserLoading || isUserDataLoading || (!!editId && isEditingVehicleLoading);

  if (isLoading) {
      return (
          <div className="flex h-[40vh] items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
      );
  }

  const existingImages = editingVehicle?.imageUrls || [];

  return (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="isForSale"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-white/30 p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base flex items-center gap-2">
                          <BadgePercent /> Poner a la Venta
                        </FormLabel>
                        <FormDescription>
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
                <FormField control={form.control} name="brand" render={({ field }) => (<FormItem><FormLabel>Marca</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Marca" /></SelectTrigger></FormControl><SelectContent>{carBrands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="model" render={({ field }) => (<FormItem><FormLabel>Modelo</FormLabel><FormControl><Input placeholder="Ej: Corolla" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="type" render={({ field }) => (<FormItem><FormLabel>Tipo</FormLabel><FormControl><Input placeholder="Ej: Sedan" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="year" render={({ field }) => (<FormItem><FormLabel>Año</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="currentMileage" render={({ field }) => (<FormItem><FormLabel>Km</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="licensePlate" render={({ field }) => (<FormItem><FormLabel>Placa</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="country" render={({ field }) => (<FormItem><FormLabel>País</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="País" /></SelectTrigger></FormControl><SelectContent>{countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                <div className="lg:col-span-2">
                    <FormField control={form.control} name="vin" render={({ field }) => (<FormItem><FormLabel>VIN</FormLabel><FormControl><Input {...field} value={field.value ?? ''}/></FormControl><FormMessage /></FormItem>)} />
                </div>
            
              {isForSale && (
                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <FormField control={form.control} name="price" render={({ field }) => (<FormItem><FormLabel>Precio ($)</FormLabel><FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                    <div className='space-y-2'>
                      <FormField
                        control={form.control}
                        name="images"
                        render={({ field: { onChange } }) => (
                            <FormItem>
                            <FormLabel>Fotos (máx 3)</FormLabel>
                            <FormControl>
                                <Input type="file" accept="image/*" multiple onChange={(e) => onChange(e.target.files)} />
                            </FormControl>
                            <FormDescription>Debes subir al menos una foto para el marketplace.</FormDescription>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        {existingImages.length > 0 && (
                        <div className="mt-4">
                            <Carousel className="w-full max-w-xs mx-auto mt-2">
                                <CarouselContent>
                                {existingImages.map((src, index) => (
                                    <CarouselItem key={index}>
                                    <div className="p-1">
                                        <Card>
                                        <CardContent className="flex aspect-video items-center justify-center p-0 relative overflow-hidden rounded-md">
                                            <Image src={src} alt={`Img ${index + 1}`} fill className="object-cover" />
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

            <div className="flex flex-col gap-4 pt-6 border-t">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editId ? 'Guardar Cambios' : 'Guardar Vehículo'}
              </Button>
            </div>
        </form>
    </Form>
  );
}
