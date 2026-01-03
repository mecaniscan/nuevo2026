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
import { Loader2, PlusCircle, Car, Trash2, Pencil, Briefcase, BadgePercent } from 'lucide-react';
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

const MAX_IMAGES = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const vehicleSchema = z.object({
  type: z.string().min(3, 'El tipo es muy corto.'),
  brand: z.string().min(2, 'La marca es requerida.'),
  model: z.string().min(1, 'El modelo es muy corto.'),
  year: z.preprocess(
    (a) => parseInt(z.string().parse(a), 10),
    z.number().min(1900, 'Año inválido.').max(new Date().getFullYear() + 1, 'Año inválido.')
  ),
  vin: z.string().length(17, 'El VIN debe tener 17 caracteres.'),
  licensePlate: z.string().min(3, 'La placa es muy corta.'),
  price: z.preprocess(
    (a) => parseFloat(z.string().parse(a)),
    z.number().positive('El precio debe ser un número positivo.')
  ),
  currentMileage: z.preprocess(
    (a) => parseInt(z.string().parse(a), 10),
    z.number().min(0, 'El kilometraje no puede ser negativo.')
  ),
  country: z.string().min(2, 'El país es requerido.'),
  isForSale: z.boolean().default(false),
  images: z.any()
    .refine((files) => !files || files.length === 0 || files.length <= MAX_IMAGES, `No puedes subir más de ${MAX_IMAGES} imágenes.`)
    .refine((files) => !files || Array.from(files).every((file: any) => file.size <= MAX_FILE_SIZE), `Cada imagen no debe superar los 5MB.`)
    .refine((files) => !files || Array.from(files).every((file: any) => ACCEPTED_IMAGE_TYPES.includes(file.type)), "Solo se aceptan formatos .jpg, .jpeg, .png y .webp.")
    .nullable()
    .optional(),
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
    },
  });

  const imagesFieldValue = form.watch('images');

  useEffect(() => {
    let urls: string[] = [];
    if (imagesFieldValue && imagesFieldValue.length > 0) {
      urls = Array.from(imagesFieldValue).map(file => URL.createObjectURL(file as File));
      setImagePreviews(urls);
    } else {
      const editingVehicle = editingVehicleId ? vehicles?.find(v => v.id === editingVehicleId) : null;
      if (editingVehicle?.imageUrls) {
        setImagePreviews(editingVehicle.imageUrls);
      } else {
        setImagePreviews([]);
      }
    }

    return () => {
      urls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [imagesFieldValue, editingVehicleId, vehicles]);

  const uploadImages = async (files: FileList): Promise<string[]> => {
    if (!storage || !user) {
        throw new Error("Storage service not available.");
    }
    const imageUrls: string[] = [];
    for (const file of Array.from(files)) {
        const imageRef = storageRef(storage, `vehicles/${user.uid}/${uuidv4()}`);
        const snapshot = await uploadBytes(imageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        imageUrls.push(downloadURL);
    }
    return imageUrls;
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
  
      // If new images are uploaded, process them. Otherwise, keep the existing ones.
      if (values.images && values.images.length > 0) {
        finalImageUrls = await uploadImages(values.images);
      }
  
      const vehicleId = editingVehicleId || doc(vehiclesCollectionRef).id;
      const { images, ...formValues } = values;
  
      const vehiclePayload: Vehicle = {
        id: vehicleId,
        userId: user.uid,
        ...formValues,
        imageUrls: finalImageUrls,
        sellerName: `${userData.firstName} ${userData.lastName}`,
        sellerWhatsapp: userData.whatsappNumber || '',
      };
  
      const batch = writeBatch(firestore);
      const userVehicleRef = doc(vehiclesCollectionRef, vehicleId);
      
      batch.set(userVehicleRef, vehiclePayload, { merge: true });
      
      await batch.commit();
  
      toast({
        title: editingVehicleId ? '¡Vehículo Actualizado!' : '¡Vehículo Añadido!',
        description: `Tu vehículo ha sido ${editingVehicleId ? 'actualizado' : 'guardado'}. Si está a la venta, aparecerá en el marketplace en breve.`,
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
    
    batch.delete(userVehicleRef);
    
    try {
        await batch.commit();
        toast({
            title: 'Vehículo Eliminado',
            description: 'El vehículo ha sido eliminado de tus registros.',
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
      price: 0,
      currentMileage: 0,
      country: '',
      isForSale: false,
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

  if (!user) {
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
                                                {vehicle.imageUrls && vehicle.imageUrls[0] ? (
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
                                        <TableCell>${vehicle.price?.toLocaleString()}</TableCell>
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
                                                            el vehículo de tus registros.
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <FormField control={form.control} name="type" render={({ field }) => (<FormItem><FormLabel>Tipo</FormLabel><FormControl><Input placeholder="Ej: Sedan, SUV" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="brand" render={({ field }) => (<FormItem><FormLabel>Marca</FormLabel><FormControl><Input placeholder="Ej: Toyota" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="model" render={({ field }) => (<FormItem><FormLabel>Modelo</FormLabel><FormControl><Input placeholder="Ej: Corolla" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="year" render={({ field }) => (<FormItem><FormLabel>Año</FormLabel><FormControl><Input type="number" placeholder="2022" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="price" render={({ field }) => (<FormItem><FormLabel>Precio ($)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="25000.00" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="currentMileage" render={({ field }) => (<FormItem><FormLabel>Kilometraje Actual</FormLabel><FormControl><Input type="number" placeholder="50000" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="licensePlate" render={({ field }) => (<FormItem><FormLabel>Placa</FormLabel><FormControl><Input placeholder="ABC-123" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="country" render={({ field }) => (<FormItem><FormLabel>País</FormLabel><FormControl><Input placeholder="Ej: Argentina" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <div className="lg:col-span-3">
                    <FormField control={form.control} name="vin" render={({ field }) => (<FormItem><FormLabel>Código VIN</FormLabel><FormControl><Input placeholder="17 caracteres" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                  <div className="lg:col-span-3">
                     <FormField
                        control={form.control}
                        name="images"
                        render={({ field: { onChange, value, ...rest } }) => (
                          <FormItem>
                            <FormLabel>Imágenes del Vehículo (hasta {MAX_IMAGES})</FormLabel>
                            <FormControl>
                                <Input type="file" multiple accept="image/*" onChange={(e) => onChange(e.target.files)} {...rest} />
                            </FormControl>
                            <FormDescription>
                              Sube hasta {MAX_IMAGES} imágenes. Si estás editando, las nuevas imágenes reemplazarán a las anteriores.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {imagePreviews.length > 0 && (
                        <div className="mt-4">
                            <FormLabel>Vista Previa de Imágenes</FormLabel>
                            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {imagePreviews.map((preview, index) => (
                                    <div key={index} className="relative aspect-video w-full overflow-hidden rounded-md">
                                        <Image src={preview} alt={`Vista previa de imagen ${index + 1}`} fill className="object-cover"/>
                                    </div>
                                ))}
                            </div>
                        </div>
                      )}
                  </div>
                </div>

                 <div className="space-y-4 pt-4 border-t">
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


                <div className="flex gap-4">
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
