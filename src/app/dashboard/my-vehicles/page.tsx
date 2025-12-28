'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useFirestore, useMemoFirebase, FirestorePermissionError, errorEmitter, useDoc, useStorage } from '@/firebase';
import { collection, query, orderBy, doc, writeBatch, getDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Car, Trash2, Pencil, Briefcase, BadgePercent, FileText, Download, Share2, Save } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useRouter } from 'next/navigation';

const CertificateItem = ({ label, value }: { label: string; value: string | number | undefined }) => (
    <div className="flex justify-between py-2 border-b border-dashed">
        <dt className="text-sm text-muted-foreground">{label}:</dt>
        <dd className="text-sm font-semibold text-foreground">{value || 'N/A'}</dd>
    </div>
);

const VehicleCertificate = ({ vehicle, user }: { vehicle: Vehicle, user: User | null }) => {
    const { toast } = useToast();
    const [isGenerating, setIsGenerating] = useState(false);
    const router = useRouter();
    const storage = useStorage();
    const firestore = useFirestore();
    
    if (!user) return null;

    const validationUrl = `${window.location.origin}/validate-certificate/${vehicle.certificateNumber}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(validationUrl)}&size=100x100&bgcolor=ffffff`;

    const generateContent = async (output: 'pdf' | 'whatsapp' | 'storage') => {
        const content = document.getElementById(`certificate-${vehicle.id}`);
        if (!content) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo encontrar el contenido del certificado.' });
            return;
        }

        setIsGenerating(true);
        try {
            const canvas = await html2canvas(content, { scale: 2, backgroundColor: null });
            const imgData = canvas.toDataURL('image/png');

            if (output === 'pdf') {
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                pdf.save(`certificado-venta-${vehicle.brand}-${vehicle.model}.pdf`);
            } else if (output === 'whatsapp') {
                const encodedImage = encodeURIComponent(imgData);
                router.push(`/certificate-preview?image=${encodedImage}`);
            } else if (output === 'storage') {
                 if (!storage || !firestore || !user) throw new Error("Servicios de Firebase no disponibles.");
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                const pdfBlob = pdf.output('blob');

                const pdfRef = storageRef(storage, `certificates/${user.uid}/${vehicle.id}.pdf`);
                const snapshot = await uploadBytes(pdfRef, pdfBlob);
                const downloadURL = await getDownloadURL(snapshot.ref);

                const vehicleRef = doc(firestore, `users/${user.uid}/vehicles`, vehicle.id);
                const batch = writeBatch(firestore);
                batch.update(vehicleRef, { certificatePdfUrl: downloadURL });
                await batch.commit();
                 toast({
                    title: '¡PDF Guardado!',
                    description: 'El certificado ha sido guardado en Firebase Storage.',
                });
            }
        } catch (error) {
            console.error('Error generating content:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo generar el documento.' });
        } finally {
            setIsGenerating(false);
        }
    };


    return (
        <DialogContent className="max-w-3xl">
             <DialogHeader className='flex-row items-center justify-between'>
                <div>
                    <DialogTitle className="text-2xl font-bold font-headline text-primary sr-only">Certificado de Venta</DialogTitle>
                    <DialogDescription className="sr-only">
                        Revisa y descarga el certificado de venta del vehículo.
                    </DialogDescription>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Button onClick={() => generateContent('storage')} disabled={isGenerating}>
                        {isGenerating ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2" />}
                        Guardar PDF en Storage
                    </Button>
                    <Button onClick={() => generateContent('whatsapp')} disabled={isGenerating}>
                        {isGenerating ? <Loader2 className="mr-2 animate-spin" /> : <Share2 className="mr-2" />}
                        Compartir por WhatsApp
                    </Button>
                    <Button onClick={() => generateContent('pdf')} disabled={isGenerating}>
                        {isGenerating ? <Loader2 className="mr-2 animate-spin" /> : <Download className="mr-2" />}
                        Descargar PDF
                    </Button>
                </div>
            </DialogHeader>
             <div id={`certificate-${vehicle.id}`} className="space-y-4 bg-white text-black p-8 rounded-lg">
                 <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <Car className="h-10 w-10 text-primary" />
                        <div>
                            <h1 className="text-2xl font-bold font-headline text-primary">CERTIFICADO DE VENTA PRIVADO</h1>
                            <p className="text-muted-foreground text-sm">Documento generado por MecaniScan</p>
                        </div>
                    </div>
                    <div className='flex flex-col items-center'>
                         <Image src={qrCodeUrl} alt="Código QR de Verificación" width={80} height={80} />
                         <p className='text-[8px] text-muted-foreground mt-1'>Escanear para verificar</p>
                    </div>
                </div>

                <Separator />
                <div>
                    <h2 className="text-lg font-semibold mb-2 border-b pb-1">Datos del Vendedor</h2>
                    <dl className="space-y-1">
                        <CertificateItem label="Nombre" value={`${user.firstName} ${user.lastName}`} />
                        <CertificateItem label="Correo Electrónico" value={user.email} />
                        <CertificateItem label="Número de WhatsApp" value={user.whatsappNumber} />
                        <CertificateItem label="Fecha de Emisión" value={format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es })} />
                        <CertificateItem label="Número de Certificado" value={vehicle.certificateNumber} />
                    </dl>
                </div>
                <Separator />
                 <div>
                    <h2 className="text-lg font-semibold mb-2 border-b pb-1">Datos del Vehículo</h2>
                     <dl className="space-y-1">
                        <CertificateItem label="Marca" value={vehicle.brand} />
                        <CertificateItem label="Modelo" value={vehicle.model} />
                        <CertificateItem label="Año" value={vehicle.year} />
                        <CertificateItem label="Tipo" value={vehicle.type} />
                        <CertificateItem label="Código VIN" value={vehicle.vin} />
                        <CertificateItem label="Placa" value={vehicle.licensePlate} />
                        <CertificateItem label="Kilometraje Actual" value={`${vehicle.currentMileage.toLocaleString()} km`} />
                        <CertificateItem label="País de Registro" value={vehicle.country} />
                        <CertificateItem label="Precio de Venta Sugerido" value={`$${vehicle.price.toLocaleString()}`} />
                    </dl>
                </div>
                 <Separator />
                 <div>
                    <h2 className="text-lg font-semibold mb-2 border-b pb-1">Datos del Comprador</h2>
                     <div className="space-y-6 pt-4">
                        <div className="space-y-1">
                             <div className="w-full h-7 border-b border-foreground/50"></div>
                             <p className="text-center text-xs text-muted-foreground">Nombre y Apellido</p>
                        </div>
                        <div className="space-y-1">
                            <div className="w-full h-7 border-b border-foreground/50"></div>
                            <p className="text-center text-xs text-muted-foreground">Número de Identificación</p>
                        </div>
                    </div>
                </div>

                <div className="pt-8">
                    <div className="signature-section flex justify-around items-end">
                        <div className="signature-box w-[45%] text-center">
                            <div className="signature-line w-full h-10 border-b border-foreground/50 mb-2"></div>
                            <p className="signature-label text-center text-xs text-muted-foreground">Firma del Vendedor</p>
                            <p className="text-center text-sm font-semibold">{`${user.firstName} ${user.lastName}`}</p>
                        </div>
                        <div className="signature-box w-[45%] text-center">
                            <div className="signature-line w-full h-10 border-b border-foreground/50 mb-2"></div>
                            <p className="signature-label text-center text-xs text-muted-foreground">Firma del Comprador</p>
                        </div>
                    </div>
                    <div className="bg-muted/50 p-4 rounded-md text-center mt-8">
                       <p className="text-xs text-muted-foreground">
                          Este documento es un certificado de venta privado. MecaniScan no se hace responsable de la veracidad de los datos. Se recomienda una inspección profesional.
                      </p>
                  </div>
                </div>
             </div>
        </DialogContent>
    );
};

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
  images: z.any().optional(),
});


export default function MyVehiclesPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);

  const vehiclesCollection = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, `users/${user.uid}/vehicles`);
  }, [firestore, user]);

  const vehiclesQuery = useMemoFirebase(() => {
    if (!vehiclesCollection) return null;
    return query(vehiclesCollection, orderBy('brand'));
  }, [vehiclesCollection]);

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
    if (!user || !firestore || !userDocRef) {
        toast({ variant: 'destructive', title: 'Error', description: 'Debes iniciar sesión.' });
        return;
    }

    setIsSubmitting(true);

    try {
        let uploadedImageUrls: string[] | undefined;
        if (values.images && values.images.length > 0) {
            uploadedImageUrls = await uploadImages(values.images);
        }

        const userDocSnap = await getDoc(userDocRef);
        const userData = userDocSnap.data() as User | undefined;
        const sellerName = user.displayName || `${userData?.firstName} ${userData?.lastName}` || 'Vendedor Anónimo';
        const sellerWhatsapp = userData?.whatsappNumber || '';

        const batch = writeBatch(firestore);
        const vehicleId = editingVehicleId || doc(collection(firestore, `users/${user.uid}/vehicles`)).id;
        const userVehicleRef = doc(firestore, `users/${user.uid}/vehicles`, vehicleId);
        const marketplaceVehicleRef = doc(firestore, 'marketplace', vehicleId);
        
        const { images, ...restOfValues } = values;
        
        const vehiclePayload: Partial<Vehicle> = {
            ...restOfValues,
            userId: user.uid,
            sellerName,
            sellerWhatsapp,
        };

        if (uploadedImageUrls) {
            vehiclePayload.imageUrls = uploadedImageUrls;
        }

        if (editingVehicleId) {
            batch.update(userVehicleRef, vehiclePayload);
        } else {
            vehiclePayload.id = vehicleId;
            vehiclePayload.certificateNumber = uuidv4();
            vehiclePayload.certificatePdfUrl = '';
            batch.set(userVehicleRef, vehiclePayload as Vehicle);
        }

        if (values.isForSale) {
            const currentVehicleData = vehicles?.find(v => v.id === editingVehicleId) || {};
            const marketplacePayload = { 
                ...currentVehicleData,
                ...vehiclePayload, 
                id: vehicleId,
            };
            batch.set(marketplaceVehicleRef, marketplacePayload, { merge: true });
        } else {
            batch.delete(marketplaceVehicleRef);
        }
        
        await batch.commit();

        toast({
            title: editingVehicleId ? '¡Vehículo Actualizado!' : '¡Vehículo Añadido!',
            description: `Tu vehículo ha sido ${editingVehicleId ? 'actualizado' : 'guardado'}.`,
        });
        form.reset();
        setEditingVehicleId(null);
    } catch (error: any) {
        console.error("Error submitting vehicle:", error);
        toast({
            variant: 'destructive',
            title: 'Error al guardar',
            description: error.message || 'No se pudo guardar el vehículo.',
        });
    } finally {
        setIsSubmitting(false);
    }
}


  async function handleDeleteVehicle(vehicleId: string) {
    if (!user || !firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'No autenticado.' });
        return;
    }
    
    const userVehicleRef = doc(firestore, `users/${user.uid}/vehicles`, vehicleId);
    const marketplaceVehicleRef = doc(firestore, 'marketplace', vehicleId);
    
    try {
        const batch = writeBatch(firestore);
        batch.delete(marketplaceVehicleRef);
        batch.delete(userVehicleRef);
        await batch.commit();
        toast({
            title: 'Vehículo Eliminado',
            description: 'El vehículo ha sido eliminado de tus registros y del marketplace.',
        });
    } catch (error: any) {
        console.error("Error deleting vehicle:", error);
        errorEmitter.emit('permission-error', new FirestorePermissionError({
             path: marketplaceVehicleRef.path,
             operation: 'delete',
        }));
        toast({
            variant: 'destructive',
            title: 'Error al Eliminar',
            description: 'No se pudo eliminar el vehículo. ' + error.message,
        });
    }
}

  function handleEditVehicle(vehicle: Vehicle) {
    setEditingVehicleId(vehicle.id);
    form.reset({
        ...vehicle,
        images: undefined,
    });
  }

  const isLoading = isUserLoading || areVehiclesLoading || isUserDataLoading;
  
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
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-blue-500 hover:bg-blue-500/10" title="Generar Certificado">
                                                        <FileText className="h-4 w-4" />
                                                    </Button>
                                                </DialogTrigger>
                                                {userData && <VehicleCertificate vehicle={vehicle} user={userData} /> }
                                            </Dialog>
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
                            <FormLabel>Imágenes del Vehículo</FormLabel>
                            <FormControl>
                                <Input type="file" multiple accept="image/*" onChange={(e) => onChange(e.target.files)} {...rest} />
                            </FormControl>
                            <FormDescription>
                              Sube una o más imágenes de tu vehículo. La carga de imágenes es opcional.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
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
                    <Button variant="outline" onClick={() => { setEditingVehicleId(null); form.reset(); }}>Cancelar Edición</Button>
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
