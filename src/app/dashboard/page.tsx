'use client';

import React, { useEffect } from 'react';
import { useUser, useFirestore, useMemoFirebase, useCollection, useAuth, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, where, doc, getDocs, writeBatch, orderBy } from 'firebase/firestore';
import type { Workshop, Vehicle, OilChange } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, Wrench, Trash2, Settings, Pencil, LogOut, Building, ArrowRight, Droplets, Car, Heart, FileCheck, BadgePercent, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
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
import { signOut } from 'firebase/auth';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';

interface ActionButtonProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  disabled?: boolean;
}

const ActionButton = ({ href, icon, title, description, disabled = false }: ActionButtonProps) => (
  <Link href={!disabled ? href : '#'} className={cn("group block", disabled && "pointer-events-none opacity-50")}>
      <Card className="h-full transition-all duration-300 hover:border-primary hover:shadow-xl hover:-translate-y-1 bg-card/40 backdrop-blur-sm border-primary/10">
          <CardHeader className="flex flex-row items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-full group-hover:bg-primary/20 transition-colors">
                  {icon}
              </div>
              <div className="flex-1">
                  <CardTitle className="text-xl font-semibold text-primary">{title}</CardTitle>
                  <CardDescription className="text-muted-foreground">{description}</CardDescription>
              </div>
              <ArrowRight className="ml-auto h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1"/>
          </CardHeader>
      </Card>
  </Link>
);

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // Queries
  const userWorkshopsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, 'workshops'), where('ownerId', '==', user.uid));
  }, [firestore, user?.uid]);

  const vehiclesQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, `users/${user.uid}/vehicles`), orderBy('brand'));
  }, [firestore, user?.uid]);

  const oilChangesQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, `users/${user.uid}/oilChanges`), orderBy('date', 'desc'));
  }, [firestore, user?.uid]);

  const { data: workshops, isLoading: isWorkshopsLoading } = useCollection<Workshop>(userWorkshopsQuery);
  const { data: vehicles, isLoading: isVehiclesLoading } = useCollection<Vehicle>(vehiclesQuery);
  const { data: oilChanges, isLoading: isOilChangesLoading } = useCollection<OilChange>(oilChangesQuery);
    
  const handleLogout = () => {
    if (auth) {
      signOut(auth);
    }
  };

  const deleteCollection = async (colPath: string) => {
    if (!firestore) return;
    try {
        const colRef = collection(firestore, colPath);
        const snapshot = await getDocs(colRef);
        if (snapshot.empty) return;
        const batch = writeBatch(firestore);
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
    } catch (e) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: colPath,
            operation: 'delete'
        }));
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || !firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar la cuenta.' });
        return;
    }
    
    try {
        const userId = user.uid;
        const batch = writeBatch(firestore);

        if (workshops && workshops.length > 0) {
            const workshop = workshops[0];
            await deleteCollection(`workshops/${workshop.id}/services`);
            await deleteCollection(`workshops/${workshop.id}/reviews`);
            
            const workshopAppointmentsQuery = query(collection(firestore, 'appointments'), where('workshopId', '==', workshop.id));
            const workshopAppointmentsSnapshot = await getDocs(workshopAppointmentsQuery);
            workshopAppointmentsSnapshot.forEach(doc => batch.delete(doc.ref));

            batch.delete(doc(firestore, 'workshops', workshop.id));
        }
        
        const marketplaceQuery = query(collection(firestore, 'marketplace'), where('userId', '==', userId));
        const marketplaceSnapshot = await getDocs(marketplaceQuery);
        marketplaceSnapshot.forEach(doc => batch.delete(doc.ref));
        
        await deleteCollection(`users/${userId}/vehicles`);
        await deleteCollection(`users/${userId}/oilChanges`);
        await deleteCollection(`users/${userId}/favorites`);

        const appointmentsQuery = query(collection(firestore, 'appointments'), where('userId', '==', userId));
        const appointmentsSnapshot = await getDocs(appointmentsQuery);
        appointmentsSnapshot.forEach(doc => batch.delete(doc.ref));

        batch.delete(doc(firestore, 'users', userId));
        
        batch.commit().then(async () => {
            try {
                await user.delete();
                toast({ title: 'Cuenta Eliminada', description: 'Tu cuenta ha sido eliminada permanentemente.' });
            } catch (authError: any) {
                 if (authError.code === 'auth/requires-recent-login') {
                    toast({
                        variant: 'destructive',
                        title: 'Se requiere re-autenticación',
                        description: 'Debes volver a iniciar sesión para poder eliminar tu cuenta.',
                    });
                 }
            }
        }).catch(() => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: `users/${userId}`,
                operation: 'delete'
            }));
        });
        
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Ocurrió un error al procesar la solicitud.' });
    }
  };

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [isUserLoading, user, router]);

  const isLoading = isUserLoading || isWorkshopsLoading || isVehiclesLoading || isOilChangesLoading;

  if (isLoading && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const hasWorkshop = workshops && workshops.length > 0;

  const getNextOilChange = (vehicleId: string) => {
    const latestChange = oilChanges?.find(oc => oc.vehicleId === vehicleId);
    return latestChange ? latestChange.nextChangeMileage : null;
  };
  
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold font-headline text-primary tracking-tight">Panel de Control</h1>
          <p className="text-muted-foreground">Bienvenido de nuevo, <span className="text-foreground font-semibold">{user?.displayName || user?.email}</span>.</p>
        </div>
        <Button onClick={handleLogout} variant="outline" className="mt-4 sm:mt-0 border-primary/20 hover:bg-primary/10">
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar Sesión
        </Button>
      </div>
      
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Vehicles Summary Section with Thumbnails */}
        <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2 text-primary"><Car /> Mis Vehículos</h2>
                <Button variant="link" asChild className="p-0 text-primary hover:text-primary/80">
                    <Link href="/dashboard/my-vehicles" className="flex items-center">Gestionar todos <ArrowRight className="ml-1 h-4 w-4"/></Link>
                </Button>
            </div>
            
            {isVehiclesLoading ? (
                <div className="flex h-32 items-center justify-center bg-card/20 rounded-xl border border-dashed border-primary/20"><Loader2 className="animate-spin h-8 w-8 text-primary"/></div>
            ) : vehicles && vehicles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {vehicles.slice(0, 3).map((vehicle) => {
                        const nextChange = getNextOilChange(vehicle.id);
                        return (
                            <Card key={vehicle.id} className="overflow-hidden border-primary/20 hover:border-primary/50 transition-all shadow-md bg-card/40 backdrop-blur-md group">
                                <CardContent className="p-0 flex items-stretch h-32">
                                    <div className="relative w-32 shrink-0 bg-muted">
                                        {vehicle.imageUrls && vehicle.imageUrls[0] ? (
                                            <Image src={vehicle.imageUrls[0]} alt={vehicle.brand} fill className="object-cover transition-transform group-hover:scale-110" />
                                        ) : (
                                            <Car className="h-10 w-10 text-muted-foreground m-auto absolute inset-0" />
                                        )}
                                    </div>
                                    <div className="p-4 flex flex-col justify-between flex-1 overflow-hidden">
                                        <div>
                                            <h3 className="font-bold truncate text-sm text-primary uppercase tracking-wider">{vehicle.brand} {vehicle.model}</h3>
                                            <p className="text-[10px] text-muted-foreground font-mono">{vehicle.year} &bull; {vehicle.licensePlate}</p>
                                        </div>
                                        <div className="space-y-1">
                                            {nextChange ? (
                                                <div className="flex items-center gap-1 text-[10px] font-bold text-orange-500">
                                                    <Droplets className="h-3 w-3" />
                                                    Próximo cambio: {nextChange.toLocaleString()} km
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground italic">
                                                    <AlertCircle className="h-3 w-3" />
                                                    Sin registro de aceite
                                                </div>
                                            )}
                                            {vehicle.isForSale ? (
                                                <Badge className="text-[9px] h-4 px-1.5 bg-accent text-accent-foreground border-transparent font-bold">
                                                    <BadgePercent className="h-2 w-2 mr-1"/> MARKETPLACE
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-primary/30 text-primary/80">USO PERSONAL</Badge>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <Card className="flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-primary/5 to-card/20 border-dashed border-2 border-primary/20 rounded-xl">
                    <CardHeader>
                        <CardTitle className="text-lg text-primary">Tu Garaje Digital está vacío</CardTitle>
                        <CardDescription>Añade tus vehículos para llevar un control profesional de su mantenimiento y certificados.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
                            <Link href="/dashboard/register-vehicle">Registrar mi primer vehículo</Link>
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>

        <div className="lg:col-span-1">
            <ActionButton 
                href="/dashboard/my-appointments"
                icon={<Calendar className="h-8 w-8 text-primary"/>}
                title="Citas WhatsApp"
                description="Historial de citas agendadas."
            />
        </div>
        
        <div className="lg:col-span-1">
             <ActionButton 
                href="/dashboard/my-favorites"
                icon={<Heart className="h-8 w-8 text-primary"/>}
                title="Mis Favoritos"
                description="Acceso rápido a tus talleres."
            />
        </div>

        <div className="lg:col-span-1">
             <ActionButton 
                href="/dashboard/oil-changes"
                icon={<Droplets className="h-8 w-8 text-primary"/>}
                title="Mantenimiento"
                description="Control de cambios de aceite."
            />
        </div>

        <div className="lg:col-span-1">
             <ActionButton 
                href="/dashboard/my-vehicles"
                icon={<Car className="h-8 w-8 text-primary"/>}
                title="Gestionar Autos"
                description="Registra y edita tu flota."
            />
        </div>

        <div className="lg:col-span-2">
             <ActionButton 
                href="/dashboard/certificates"
                icon={<FileCheck className="h-8 w-8 text-primary"/>}
                title="Certificados Venta"
                description="Documentación digital de tus autos."
            />
        </div>

        <div className="lg:col-span-3">
             <Card className="border-primary/10 bg-card/20 backdrop-blur-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl font-bold text-primary"><Settings className="h-5 w-5"/> Configuración de la Cuenta</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                    <Button asChild variant="outline" className="border-primary/20">
                      <Link href="/dashboard/profile">
                        <Pencil className="mr-2 h-4 w-4" /> Editar Perfil
                      </Link>
                    </Button>
                    <Button asChild variant={hasWorkshop ? "outline" : "default"} className={!hasWorkshop ? "bg-primary text-primary-foreground font-bold" : "border-primary/20"}>
                        <Link href={hasWorkshop ? "/dashboard/edit-workshop" : "/dashboard/register-workshop"}>
                            {hasWorkshop ? <><Wrench className="mr-2 h-4 w-4" />Gestionar mi Taller</> : <><Building className="mr-2 h-4 w-4" />Registrar mi Taller</>}
                        </Link>
                    </Button>
                     {hasWorkshop && (
                        <Button asChild variant="outline" className="border-primary/20">
                            <Link href="/dashboard/edit-services">
                                <Wrench className="mr-2 h-4 w-4" />Gestionar Servicios
                            </Link>
                        </Button>
                    )}
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" className="ml-auto">
                               <Trash2 className="mr-2 h-4 w-4"/> Eliminar Cuenta
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción no se puede deshacer. Esto eliminará permanentemente tu cuenta y todos los datos asociados (vehículos, talleres, citas).
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive hover:bg-destructive/90 text-white font-bold">Confirmar Eliminación</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}