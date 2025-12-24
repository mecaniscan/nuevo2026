'use client';

import { useUser, useFirestore, useMemoFirebase, deleteDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, where, doc, orderBy, limit } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { Workshop, Appointment, OilChange, Vehicle } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, Wrench, Trash2, Settings, Pencil, LogOut, User as UserIcon, Lock, Building, ArrowRight, Droplets, Car, Gauge, ScanLine, Heart } from 'lucide-react';
import Link from 'next/link';
import { initiateSignOut, initiateEmailSignIn } from '@/firebase/non-blocking-login';
import { useAuth } from '@/firebase';
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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import React from 'react';
import { Progress } from '@/components/ui/progress';


const loginSchema = z.object({
  email: z.string().email('El correo electrónico no es válido.'),
  password: z.string().min(1, 'La contraseña es obligatoria.'),
});

const VehicleSummaryCard = ({ vehicle, oilChange }: { vehicle: Vehicle, oilChange: OilChange }) => {
    const mileageProgress = oilChange.nextChangeMileage > 0 
        ? (vehicle.currentMileage / oilChange.nextChangeMileage) * 100 
        : 0;

    return (
        <Card className="bg-gradient-to-br from-primary/10 to-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-bold text-primary">
                    <Car />
                    {vehicle.brand} {vehicle.model} ({vehicle.year})
                </CardTitle>
                <CardDescription>Resumen de tu vehículo principal</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-card">
                    <div className='flex items-center gap-2'>
                        <Gauge className="text-primary"/>
                        <span className="font-semibold">Kilometraje Actual</span>
                    </div>
                    <span className="font-bold text-lg">{vehicle.currentMileage?.toLocaleString() ?? 'N/A'} km</span>
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between items-baseline">
                         <div className='flex items-center gap-2'>
                            <Droplets className="text-primary"/>
                            <span className="text-sm font-medium">Próximo Cambio de Aceite</span>
                        </div>
                        <span className="text-sm font-semibold">{oilChange.nextChangeMileage.toLocaleString()} km</span>
                    </div>
                    <Progress value={mileageProgress} />
                    <p className="text-xs text-muted-foreground text-right">
                       Faltan {(oilChange.nextChangeMileage - vehicle.currentMileage).toLocaleString()} km
                    </p>
                </div>
            </CardContent>
        </Card>
    );
};

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);

  // --- Data Fetching ---
  const workshopsCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'workshops');
  }, [firestore]);

  const userWorkshopsQuery = useMemoFirebase(() => {
    if (!workshopsCollection || !user) return null;
    return query(workshopsCollection, where('ownerId', '==', user.uid));
  }, [workshopsCollection, user]);

  const { data: workshops, isLoading: isWorkshopsLoading } = useCollection<Workshop>(userWorkshopsQuery);
    
  const appointmentsCollection = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.uid, 'appointments');
  }, [firestore, user]);

  const { data: appointments, isLoading: isAppointmentsLoading } = useCollection<Appointment>(appointmentsCollection);

  const oilChangesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, `users/${user.uid}/oilChanges`), orderBy('nextChangeMileage', 'asc'), limit(1));
  }, [firestore, user]);
  const { data: nextOilChanges, isLoading: isOilChangesLoading } = useCollection<OilChange>(oilChangesQuery);
  const nextOilChange = nextOilChanges?.[0];

  const vehicleQuery = useMemoFirebase(() => {
    if (!firestore || !user || !nextOilChange) return null;
    return doc(firestore, `users/${user.uid}/vehicles`, nextOilChange.vehicleId);
  }, [firestore, user, nextOilChange]);
  const { data: mainVehicle, isLoading: isVehicleLoading } = useDoc<Vehicle>(vehicleQuery);


  // --- Event Handlers ---
  const handleLogout = () => {
    initiateSignOut(auth);
  };

  const handleDeleteAccount = async () => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar la cuenta.' });
      return;
    }
    try {
      if (workshops && workshops.length > 0) {
        const workshopRef = doc(firestore, 'workshops', workshops[0].id);
        deleteDocumentNonBlocking(workshopRef);
      }
      
      if (appointments && appointments.length > 0) {
        appointments.forEach(apt => {
          const appointmentRef = doc(firestore, 'users', user.uid, 'appointments', apt.id);
          deleteDocumentNonBlocking(appointmentRef);
        });
      }

      const userDocRef = doc(firestore, 'users', user.uid);
      deleteDocumentNonBlocking(userDocRef);

      await user.delete();

      toast({ title: 'Cuenta Eliminada', description: 'Tu cuenta y todos tus datos han sido eliminados.' });

    } catch (error) {
      console.error("Error deleting account:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Ocurrió un error al eliminar tu cuenta. Vuelve a iniciar sesión e inténtalo de nuevo.' });
    }
  };

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onLoginSubmit(values: z.infer<typeof loginSchema>) {
    setIsLoggingIn(true);
    try {
      await initiateEmailSignIn(auth, values.email, values.password);
    } catch (error: any) {
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        toast({
          variant: 'destructive',
          title: 'Error de Inicio de Sesión',
          description: 'El correo electrónico o la contraseña son incorrectos.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error Inesperado',
          description: 'Ocurrió un error al intentar iniciar sesión. Por favor, intenta de nuevo.',
        });
      }
    } finally {
      setIsLoggingIn(false);
    }
  }

  // --- Loading and Auth States ---
  const isLoading = isUserLoading || isWorkshopsLoading || isAppointmentsLoading || isOilChangesLoading || isVehicleLoading;
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-headline">Bienvenido de Nuevo</CardTitle>
                    <CardDescription>Inicia sesión para acceder a tu panel.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="email">
                    <TabsList className="grid w-full grid-cols-1">
                      <TabsTrigger value="email">Correo</TabsTrigger>
                    </TabsList>
                    <TabsContent value="email" className="pt-4">
                        <Form {...loginForm}>
                          <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                            <FormField
                              control={loginForm.control}
                              name="email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Correo Electrónico</FormLabel>
                                  <FormControl>
                                    <Input type="email" placeholder="tu@correo.com" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={loginForm.control}
                              name="password"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Contraseña</FormLabel>
                                  <FormControl>
                                    <Input type="password" placeholder="••••••••" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <Button type="submit" className="w-full" disabled={isLoggingIn}>
                               {isLoggingIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                               {isLoggingIn ? 'Iniciando Sesión...' : 'Iniciar Sesión'}
                            </Button>
                          </form>
                        </Form>
                    </TabsContent>
                  </Tabs>
                </CardContent>
                <CardContent className="flex flex-col gap-2 text-center">
                     <p className="text-sm text-muted-foreground">
                        ¿No tienes una cuenta?{' '}
                        <Button variant="link" className="p-0 h-auto" asChild>
                            <Link href="/register">Regístrate aquí</Link>
                        </Button>
                    </p>
                    <Button variant="link" asChild>
                      <Link href="/">Volver a la página principal</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
  }

  // --- Render ---
  const hasWorkshop = workshops && workshops.length > 0;
  
  const ActionButton = ({ href, icon, title, description }: { href: string; icon: React.ReactNode; title: string; description: string }) => (
    <Link href={href} className="group block">
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
          {mainVehicle && nextOilChange ? (
              <VehicleSummaryCard vehicle={mainVehicle as Vehicle} oilChange={nextOilChange} />
          ) : (
             <Card className="flex flex-col items-center justify-center p-8 text-center">
                <CardHeader>
                    <CardTitle>Comienza a registrar tu actividad</CardTitle>
                    <CardDescription>Añade tu vehículo y tu primer cambio de aceite para ver un resumen aquí.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Button asChild>
                        <Link href="/dashboard/my-vehicles">Añadir Vehículo</Link>
                    </Button>
                </CardContent>
            </Card>
          )}
        </div>

        {/* Citas Section */}
        <div>
            <ActionButton 
                href="/dashboard/my-appointments"
                icon={<Calendar className="h-8 w-8 text-primary"/>}
                title="Citas por WhatsApp"
                description={`Tienes ${appointments?.length || 0} citas guardadas.`}
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
        <div className="lg:col-span-1">
             <ActionButton 
                href="/dashboard/oil-changes"
                icon={<Droplets className="h-8 w-8 text-primary"/>}
                title="Cambios de Aceite"
                description="Lleva un historial de los cambios de aceite."
            />
        </div>

        {/* AI Scanner Section */}
        <div className="lg:col-span-2">
            <ActionButton 
                href="/#decoder"
                icon={<ScanLine className="h-8 w-8 text-primary"/>}
                title="Scanner con IA"
                description="Diagnostica problemas con tu cámara."
            />
        </div>


        {/* Account Settings */}
        <div className="lg:col-span-3">
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Settings /> Configuración de la Cuenta</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                    <Button asChild variant="outline" disabled={user.isAnonymous}>
                      <Link href="/dashboard/profile">
                        <Pencil className="mr-2 h-4 w-4" /> Editar Perfil
                      </Link>
                    </Button>
                    <Button asChild variant={hasWorkshop ? "outline" : "default"} disabled={user.isAnonymous}>
                        <Link href={hasWorkshop ? "/dashboard/edit-workshop" : "/dashboard/register-workshop"}>
                            {hasWorkshop ? <><Wrench className="mr-2 h-4 w-4" />Gestionar mi Taller</> : <><Building className="mr-2 h-4 w-4" />Registrar mi Taller</>}
                        </Link>
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" disabled={user.isAnonymous}>
                               <Trash2/> Eliminar Cuenta
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción no se puede deshacer. Esto eliminará permanentemente tu cuenta,
                                tu taller registrado (si existe) y todas tus citas de nuestros servidores.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive hover:bg-destructive/90">Continuar</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    {user.isAnonymous && <p className="text-xs text-muted-foreground">Debes tener una cuenta permanente para poder editar o eliminar tu perfil y registrar un taller.</p>}
                </CardContent>
            </Card>
        </div>
      </div>

    </div>
  );
}
