'use client';

import { useUser, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, where, doc, getDocs, writeBatch } from 'firebase/firestore';
import type { Workshop } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, Wrench, Trash2, Settings, Pencil, LogOut, User as UserIcon, Lock, Building, ArrowRight, Droplets, Car, Gauge, ScanLine, Heart } from 'lucide-react';
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
} from "@/components/ui/alert-dialog"
import React, { useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';


export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [authInstance, setAuthInstance] = React.useState<any>(null);
  const router = useRouter();

  React.useEffect(() => {
    import('firebase/auth').then(authModule => {
      const auth = authModule.getAuth();
      setAuthInstance(auth);
    });
  }, []);

  // --- Data Fetching ---
  const userWorkshopsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, 'workshops'), where('ownerId', '==', user.uid));
  }, [firestore, user?.uid]);

  const { data: workshops, isLoading: isWorkshopsLoading } = useCollection<Workshop>(userWorkshopsQuery);
    
  // --- Event Handlers ---
  const handleLogout = () => {
    if (authInstance) {
      signOut(authInstance);
    }
  };

  const deleteCollection = async (colPath: string) => {
    if (!firestore) return;
    const colRef = collection(firestore, colPath);
    const snapshot = await getDocs(colRef);
    if (snapshot.empty) return;
    const batch = writeBatch(firestore);
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();
  };


  const handleDeleteAccount = async () => {
    if (!user || !firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar la cuenta. No hay usuario autenticado.' });
        return;
    }
    
    try {
        const userId = user.uid;
        const batch = writeBatch(firestore);

        // Delete workshop and its subcollections (if any)
        if (workshops && workshops.length > 0) {
            const workshop = workshops[0];
            await deleteCollection(`workshops/${workshop.id}/services`);
            await deleteCollection(`workshops/${workshop.id}/reviews`);
            
            // Also delete all appointments for this workshop
            const workshopAppointmentsQuery = query(collection(firestore, 'appointments'), where('workshopId', '==', workshop.id));
            const workshopAppointmentsSnapshot = await getDocs(workshopAppointmentsQuery);
            workshopAppointmentsSnapshot.forEach(doc => batch.delete(doc.ref));

            batch.delete(doc(firestore, 'workshops', workshop.id));
        }
        
        // Delete all vehicles from the marketplace belonging to the user
        const marketplaceQuery = query(collection(firestore, 'marketplace'), where('userId', '==', userId));
        const marketplaceSnapshot = await getDocs(marketplaceQuery);
        marketplaceSnapshot.forEach(doc => batch.delete(doc.ref));
        
        // Delete root collections associated with user
        await deleteCollection(`users/${userId}/vehicles`);
        await deleteCollection(`users/${userId}/oilChanges`);
        await deleteCollection(`users/${userId}/favorites`);

        // Delete user's appointments from the root collection
        const appointmentsQuery = query(collection(firestore, 'appointments'), where('userId', '==', userId));
        const appointmentsSnapshot = await getDocs(appointmentsQuery);
        appointmentsSnapshot.forEach(doc => batch.delete(doc.ref));

        // Delete user document
        const userDocRef = doc(firestore, 'users', userId);
        batch.delete(userDocRef);

        await batch.commit();
        
        // Finally, delete the user from Firebase Auth
        try {
            await user.delete();
            toast({ title: 'Cuenta Eliminada', description: 'Tu cuenta y todos tus datos han sido eliminados permanentemente.' });
        } catch (authError: any) {
             if (authError.code === 'auth/requires-recent-login') {
                toast({
                    variant: 'destructive',
                    title: 'Se requiere re-autenticación',
                    description: 'Por seguridad, debes volver a iniciar sesión para poder eliminar tu cuenta.',
                    duration: 9000,
                });
             } else {
                 throw authError; // Rethrow other auth errors
             }
        }

    } catch (error) {
        console.error("Error deleting account data:", error);
        toast({ variant: 'destructive', title: 'Error de Borrado de Datos', description: 'Ocurrió un error al eliminar los datos de tu cuenta. Por favor, intenta de nuevo.' });
    }
  };


  // --- Loading and Auth States ---
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [isUserLoading, user, router]);


  if (isUserLoading || isWorkshopsLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }


  // --- Render ---
  const hasWorkshop = workshops && workshops.length > 0;
  
  const ActionButton = ({ href, icon, title, description, disabled = false }: { href: string; icon: React.ReactNode; title: string; description: string, disabled?: boolean }) => (
    <Link href={!disabled ? href : '#'} className={cn("group block", disabled && "pointer-events-none opacity-50")}>
        <Card className="h-full transition-all duration-300 hover:border-primary hover:shadow-xl hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-full">
                    {icon}
                </div>
                <div>
                    <CardTitle className="text-xl font-semibold">{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </div>
                <ArrowRight className="ml-auto h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1"/>
            </CardHeader>
        </Card>
    </Link>
  );

  return (
    <div className="container mx-auto py-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold font-headline text-primary">Panel de Control</h1>
          <p className="text-muted-foreground">Bienvenido, {user.displayName || user.email}. Aquí puedes gestionar tu actividad.</p>
        </div>
        <Button onClick={handleLogout} variant="outline" className="mt-4 sm:mt-0">
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar Sesión
        </Button>
      </div>
      
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-3">
            <Card className="flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-primary/10 to-card">
                <CardHeader>
                    <CardTitle>Comienza a registrar tu actividad</CardTitle>
                    <CardDescription>Añade tus vehículos y lleva un control de su mantenimiento, como los cambios de aceite.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Button asChild>
                        <Link href="/dashboard/my-vehicles">Añadir mis Vehículos</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>

        {/* Citas Section */}
        <div className="lg:col-span-1">
            <ActionButton 
                href="/dashboard/my-appointments"
                icon={<Calendar className="h-8 w-8 text-primary"/>}
                title="Citas por WhatsApp"
                description="Gestiona tus citas guardadas."
            />
        </div>
        
        {/* Favorites Section */}
        <div className="lg:col-span-1">
             <ActionButton 
                href="/dashboard/my-favorites"
                icon={<Heart className="h-8 w-8 text-primary"/>}
                title="Mis Favoritos"
                description="Accede a tus talleres guardados."
            />
        </div>

        {/* My Vehicles Section */}
        <div className="lg:col-span-1">
             <ActionButton 
                href="/dashboard/my-vehicles"
                icon={<Car className="h-8 w-8 text-primary"/>}
                title="Mis Vehículos"
                description="Registra y gestiona tus vehículos."
            />
        </div>

        {/* Oil Change Section */}
        <div className="lg:col-span-3">
             <ActionButton 
                href="/dashboard/oil-changes"
                icon={<Droplets className="h-8 w-8 text-primary"/>}
                title="Cambios de Aceite"
                description="Lleva un historial de los cambios de aceite."
            />
        </div>

        {/* Account Settings */}
        <div className="lg:col-span-3">
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Settings /> Configuración de la Cuenta</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                    <Button asChild variant="outline">
                      <Link href="/dashboard/profile">
                        <Pencil className="mr-2 h-4 w-4" /> Editar Perfil
                      </Link>
                    </Button>
                    <Button asChild variant={hasWorkshop ? "outline" : "default"}>
                        <Link href={hasWorkshop ? "/dashboard/edit-workshop" : "/dashboard/register-workshop"}>
                            {hasWorkshop ? <><Wrench className="mr-2 h-4 w-4" />Gestionar mi Taller</> : <><Building className="mr-2 h-4 w-4" />Registrar mi Taller</>}
                        </Link>
                    </Button>
                     {hasWorkshop && (
                        <Button asChild variant="outline">
                            <Link href="/dashboard/edit-services">
                                <Wrench className="mr-2 h-4 w-4" />Gestionar Servicios
                            </Link>
                        </Button>
                    )}
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive">
                               <Trash2/> Eliminar Cuenta
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción no se puede deshacer. Esto eliminará permanentemente tu cuenta,
                                tu taller registrado (si existe) y todas las citas y vehículos asociados.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive hover:bg-destructive/90">Continuar</AlertDialogAction>
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
