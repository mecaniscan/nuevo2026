'use client';
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useFirestore, useMemoFirebase, FirestorePermissionError, errorEmitter, useDoc, useStorage, useCollection } from '@/firebase';
import { collection, query, orderBy, doc, writeBatch } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Car, Trash2, Pencil, Briefcase, BadgePercent, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import type { Vehicle, User } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
} from "@/components/ui/alert-dialog";
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';


const vehicleSchema = z.object({
  type: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  year: z.preprocess(
    (a) => a ? parseInt(z.string().parse(a), 10) : new Date().getFullYear(),
    z.number().optional()
  ),
  vin: z.string().optional(),
  licensePlate: z.string().optional(),
  price: z.preprocess(
    (a) => a ? parseFloat(z.string().parse(a)) : undefined,
    z.number().optional()
  ),
  currentMileage: z.preprocess(
    (a) => a ? parseInt(z.string().parse(a), 10) : 0,
    z.number().optional()
  ),
  country: z.string().optional(),
  isForSale: z.boolean().default(false),
  images: z.instanceof(FileList).nullable().optional(),
}).refine(data => {
    if (data.isForSale) {
        return data.images && data.images.length > 0 && data.images.length <= 3;
    }
    return true;
}, {
    message: "Debes subir entre 1 y 3 imágenes para publicar en el marketplace.",
    path: ["images"],
}).refine(data => {
    if (data.isForSale) {
        return data.price && data.price > 0;
    }
    return true;
}, {
    message: "El precio es obligatorio para poner el vehículo a la venta.",
    path: ["price"],
});


export default function MyVehiclesPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const vehiclesCollectionRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, `users/${user.uid}/vehicles`);
  }, [firestore, user]);

  const vehiclesQuery = useMemoFirebase(() => {
    if (!vehiclesCollectionRef) return null;
    return query(vehiclesCollectionRef, orderBy('brand'));
  }, [vehiclesCollectionRef]);

  const { data: vehicles, isLoading: areVehiclesLoading } = useCollection<Vehicle>(vehiclesQuery);
  
  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
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
      price: undefined,
      currentMileage: 0,
      country: '',
      isForSale: false,
      images: undefined,
    },
  });
  
  const { formState: { errors }, watch } = form;
  const isForSale = watch("isForSale");

  const imageFieldValue = watch('images');

  useEffect(() => {
    let objectUrls: string[] = [];
    const editingVehicle = editingVehicleId ? vehicles?.find(v => v.id === editingVehicleId) : null;
    
    // If new files are selected, create object URLs for them.
    if (imageFieldValue && imageFieldValue.length > 0) {
        objectUrls = Array.from(imageFieldValue).map(file => URL.createObjectURL(file));
        setImagePreviews(objectUrls);
    } else if (editingVehicle?.imageUrls && editingVehicle.imageUrls.length > 0) {
        // If not, and we are editing, show existing images from the vehicle data.
        setImagePreviews(editingVehicle.imageUrls);
    } else {
        setImagePreviews([]); // Clear previews if no files and no existing images.
    }

    // Cleanup function to revoke created object URLs to prevent memory leaks.
    return () => {
        objectUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [imageFieldValue, editingVehicleId, vehicles]);

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
      const existingVehicle = editingVehicleId ? vehicles?.find(v => v.id === editingVehicleId) : undefined;
      let finalImageUrls: string[] = existingVehicle?.imageUrls || [];
  
      if (values.isForSale && values.images && values.images.length > 0) {
        finalImageUrls = await uploadImages(values.images);
      } else if (!values.isForSale) {
        finalImageUrls = []; // Clear images if not for sale
      }
  
      const vehicleId = editingVehicleId || doc(vehiclesCollectionRef).id;
      const { images, ...formValues } = values;
  
      const vehiclePayload: Vehicle = {
        id: vehicleId,
        userId: user.uid,
        type: formValues.type || '',
        brand: formValues.brand || '',
        model: formValues.model || '',
        year: formValues.year || new Date().getFullYear(),
        vin: formValues.vin || '',
        licensePlate: formValues.licensePlate || '',
        price: formValues.price,
        currentMileage: formValues.currentMileage || 0,
        isForSale: formValues.isForSale || false,
        country: formValues.country || '',
        imageUrls: finalImageUrls,
        sellerName: `${userData.firstName} ${userData.lastName}`,
        sellerWhatsapp: userData.whatsappNumber || '',
        certificateNumber: existingVehicle?.certificateNumber || uuidv4(),
      };
  
      const batch = writeBatch(firestore);
      const userVehicleRef = doc(vehiclesCollectionRef, vehicleId);
      batch.set(userVehicleRef, vehiclePayload, { merge: true });

      const marketplaceRef = doc(firestore, 'marketplace', vehicleId);

      if (vehiclePayload.isForSale) {
        batch.set(marketplaceRef, vehiclePayload, { merge: true });
      } else {
        batch.delete(marketplaceRef);
      }
      
      await batch.commit();
  
      toast({
        title: editingVehicleId ? '¡Vehículo Actualizado!' : '¡Vehículo Añadido!',
        description: `Tu vehículo ha sido ${editingVehicleId ? 'actualizado' : 'guardado'}. ${vehiclePayload.isForSale ? 'Aparecerá en el marketplace en breve.' : ''}`,
      });
      cancelEdit();
    } catch (error: any) {
      console.error("Error submitting vehicle:", error);
      const { images, ...formValues } = values;

      errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: editingVehicleId ? `users/${user.uid}/vehicles/${editingVehicleId}` : `users/${user.uid}/vehicles`,
          operation: editingVehicleId ? 'update' : 'create',
          requestResourceData: formValues,
      }));
    } finally {
      setIsSubmitting(false);
    }
  }


  async function handleDeleteVehicle(vehicleId: string) {
    if (!user || !firestore || !vehiclesCollectionRef) {
        toast({ variant: 'destructive', title: 'Error', description: 'No autenticado.' });
        return;
    }
    
    const batch = writeBatch(firestore);
    const userVehicleRef = doc(vehiclesCollectionRef, vehicleId);
    const marketplaceRef = doc(firestore, 'marketplace', vehicleId);
    
    batch.delete(userVehicleRef);
    batch.delete(marketplaceRef);
    
    try {
        await batch.commit();
        toast({
            title: 'Vehículo Eliminado',
            description: 'El vehículo ha sido eliminado de tus registros y del marketplace.',
        });
    } catch (error: any) {
        console.error("Error deleting vehicle:", error);
         errorEmitter.emit('permission-error', new FirestorePermissionError({
             path: userVehicleRef.path,
             operation: 'delete',
        }));
    }
}

  function handleEditVehicle(vehicle: Vehicle) {
    setEditingVehicleId(vehicle.id);
    form.reset({
        ...vehicle,
        price: vehicle.price ?? undefined,
        images: undefined,
    });
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }
  
  function cancelEdit() {
    setEditingVehicleId(null);
    form.reset({
      type: '',
      brand: '',
      model: '',
      year: new Date().getFullYear(),
      vin: '',
      licensePlate: '',
      price: undefined,
      currentMileage: 0,
      country: '',
      isForSale: false,
      images: undefined,
    });
    setImagePreviews([]);
  }


  const isLoading = isUserLoading || areVehiclesLoading || isUserDataLoading;
  
  if (isUserLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && !isUserLoading) {
    return (
      <div className="container mx-auto py-12 flex items-center justify-center">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <CardTitle>Acceso Restringido</CardTitle>
            <CardDescription>Debes iniciar sesión para gestionar tus vehículos.</CardDescription>
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
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold font-headline text-primary flex items-center gap-2"><Car />Mis Vehículos</h1>
                <p className="text-muted-foreground">Añade y consulta el registro de tus vehículos.</p>
            </div>
             <Button variant="ghost" asChild>
                <Link href="/dashboard">Volver al Panel</Link>
            </Button>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Mis Vehículos Registrados</CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                     <div className="flex h-40 items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Vehículo</TableHead>
                                <TableHead>Año</TableHead>
                                <TableHead>Placa</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Kilometraje</TableHead>
                                <TableHead>Precio</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {vehicles && vehicles.length > 0 ? (
                                vehicles.map((vehicle) => (
                                    <TableRow key={vehicle.id}>
                                        <TableCell className="font-medium flex items-center gap-3">
                                            <div className="w-16 h-10 rounded-md bg-muted flex items-center justify-center text-muted-foreground relative overflow-hidden">
                                                {vehicle.imageUrls && vehicle.imageUrls.length > 0 ? (
                                                    <Image src={vehicle.imageUrls[0]} alt={`${vehicle.brand} ${vehicle.model}`} fill className="object-cover" />
                                                ) : <Car/>}
                                            </div>
                                            {vehicle.brand} {vehicle.model}
                                        </TableCell>
                                        <TableCell>{vehicle.year}</TableCell>
                                        <TableCell>{vehicle.licensePlate}</TableCell>
                                        <TableCell>
                                          {vehicle.isForSale ? (
                                            <Badge><BadgePercent className="mr-1 h-3 w-3"/> A la venta</Badge>
                                          ) : (
                                            <Badge variant="secondary">Personal</Badge>
                                          )}
                                        </TableCell>
                                        <TableCell>{vehicle.currentMileage?.toLocaleString()} km</TableCell>
                                        <TableCell>{vehicle.price ? `$${vehicle.price.toLocaleString()}`: 'N/A'}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/10" onClick={() => handleEditVehicle(vehicle)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Esta acción no se puede deshacer. Esto eliminará permanentemente
                                                            el vehículo de tus registros y del marketplace.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() => handleDeleteVehicle(vehicle.id)}
                                                            className="bg-destructive hover:bg-destructive/90"
                                                        >
                                                            Eliminar
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center h-24">
                                        No has registrado ningún vehículo todavía.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>{editingVehicleId ? 'Editar Vehículo' : 'Añadir Nuevo Vehículo'}</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                 <div className="space-y-4 pt-4">
                    <FormField
                      control={form.control}
                      name="isForSale"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base flex items-center gap-2">
                              <Briefcase /> Poner a la Venta
                            </FormLabel>
                            <FormDescription>
                              Marca esta casilla para listar este vehículo en el Marketplace. Se requerirá un precio y hasta 3 imágenes.
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
                  <FormField control={form.control} name="type" render={({ field }) => (<FormItem><FormLabel>Tipo</FormLabel><FormControl><Input placeholder="Ej: Sedan, SUV" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="brand" render={({ field }) => (<FormItem><FormLabel>Marca</FormLabel><FormControl><Input placeholder="Ej: Toyota" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="model" render={({ field }) => (<FormItem><FormLabel>Modelo</FormLabel><FormControl><Input placeholder="Ej: Corolla" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="year" render={({ field }) => (<FormItem><FormLabel>Año</FormLabel><FormControl><Input type="number" placeholder="2022" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  {isForSale && (
                     <FormField control={form.control} name="price" render={({ field }) => (<FormItem><FormLabel>Precio ($)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="25000.00" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                  )}
                  <FormField control={form.control} name="currentMileage" render={({ field }) => (<FormItem><FormLabel>Kilometraje Actual</FormLabel><FormControl><Input type="number" placeholder="50000" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="licensePlate" render={({ field }) => (<FormItem><FormLabel>Placa</FormLabel><FormControl><Input placeholder="ABC-123" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="country" render={({ field }) => (<FormItem><FormLabel>País</FormLabel><FormControl><Input placeholder="Ej: Argentina" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <div className="lg:col-span-3">
                    <FormField control={form.control} name="vin" render={({ field }) => (<FormItem><FormLabel>Código VIN</FormLabel><FormControl><Input placeholder="17 caracteres" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                 
                  {isForSale && (
                    <div className="lg:col-span-3">
                      <FormField
                          control={form.control}
                          name="images"
                          render={({ field: { onChange, value, ...rest } }) => (
                            <FormItem>
                              <FormLabel>Imágenes del Vehículo (hasta 3)</FormLabel>
                              <FormControl>
                                  <Input type="file" accept="image/*" multiple onChange={(e) => onChange(e.target.files)} />
                              </FormControl>
                              <FormDescription>
                                Sube hasta 3 imágenes para el marketplace. Si editas, las nuevas reemplazarán a las anteriores.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {imagePreviews.length > 0 && (
                          <div className="mt-4">
                              <FormLabel>Vista Previa de Imágenes</FormLabel>
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
                  )}
                </div>

                <div className="flex flex-col gap-4 pt-6 border-t">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingVehicleId ? <>Guardar Cambios</> : <><PlusCircle className="mr-2" /> Guardar Vehículo</>}
                  </Button>
                  {editingVehicleId && (
                    <Button variant="outline" onClick={cancelEdit}>Cancelar Edición</Button>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
