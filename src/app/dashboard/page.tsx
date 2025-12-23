'use client';

import { useUser, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, setDoc } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { Workshop, Appointment } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, Wrench, Trash2, Settings, Pencil, LogOut, User as UserIcon, Lock } from 'lucide-react';
import Link from 'next/link';
import { initiateAnonymousSignIn, initiateSignOut, initiateEmailSignIn } from '@/firebase/non-blocking-login';
import { useAuth } from '@/firebase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
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


const loginSchema = z.object({
  email: z.string().email('El correo electrónico no es válido.'),
  password: z.string().min(1, 'La contraseña es obligatoria.'),
});

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);


  const handleLogout = () => {
    initiateSignOut(auth);
  };

  const handleCancelAppointment = (appointmentId: string) => {
    if (!firestore || !user) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Debes iniciar sesión para cancelar una cita.',
        });
        return;
    }
    const appointmentRef = doc(firestore, 'users', user.uid, 'appointments', appointmentId);
    deleteDocumentNonBlocking(appointmentRef);
    toast({
        title: 'Cita Cancelada',
        description: 'La cita ha sido eliminada de tu agenda.',
    });
  }

  const handleDeleteWorkshop = () => {
    if (!workshops || workshops.length === 0 || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se encontró el taller para eliminar.' });
      return;
    }
    const workshopRef = doc(firestore, 'workshops', workshops[0].id);
    deleteDocumentNonBlocking(workshopRef);
    toast({ title: 'Taller Eliminado', description: 'Tu taller ha sido eliminado de la plataforma.' });
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
      // Let the onAuthStateChanged handle the redirect/UI update
    } catch (error: any) {
      console.error("Login Error:", error.code);
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

  if (isUserLoading || isWorkshopsLoading || isAppointmentsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle>Bienvenido de Nuevo</CardTitle>
                    <CardDescription>Inicia sesión para acceder a tu panel.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="email">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="email">Correo</TabsTrigger>
                      <TabsTrigger value="anonymous">Invitado</TabsTrigger>
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
                    <TabsContent value="anonymous" className="pt-4">
                       <div className="flex flex-col items-center justify-center text-center space-y-4 p-4 border-2 border-dashed rounded-lg">
                          <p className="text-muted-foreground text-sm">Explora la app como invitado. Podrás ver talleres pero no guardar citas o registrar tu propio taller de forma permanente.</p>
                          <Button onClick={() => initiateAnonymousSignIn(auth)} className="w-full">
                              <UserIcon className="mr-2"/> Continuar como Invitado
                          </Button>
                        </div>
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

  const hasWorkshop = workshops && workshops.length > 0;

  return (
    <div className="container mx-auto py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold font-headline text-primary">Tu Panel de Control</h1>
        {!hasWorkshop && (
            <Button asChild>
                <Link href="/dashboard/register-workshop">Añadir Nuevo Taller</Link>
            </Button>
        )}
      </div>
      
      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="lg:col-span-2">
            <CardHeader>
            <CardTitle className="flex items-center gap-2"><Wrench/> Mi Taller</CardTitle>
            <CardDescription>Aquí puedes ver, editar o eliminar el taller que has registrado.</CardDescription>
            </CardHeader>
            <CardContent>
            {hasWorkshop && workshops ? (
                <div className="grid grid-cols-1 gap-4">
                {workshops.map((workshop) => (
                    <Card key={workshop.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <CardTitle className="text-lg">{workshop.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{workshop.address}</p>
                        </div>
                        <div className="flex gap-2 self-end sm:self-center">
                          <Button variant="outline" size="icon" asChild>
                            <Link href="/dashboard/edit-workshop">
                              <Pencil className="h-5 w-5" />
                              <span className="sr-only">Editar Taller</span>
                            </Link>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="icon">
                                <Trash2 className="h-5 w-5" />
                                <span className="sr-only">Eliminar Taller</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás seguro de eliminar el taller?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. Esto eliminará permanentemente tu taller de nuestra plataforma.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteWorkshop} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                    </Card>
                ))}
                </div>
            ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">Aún no has registrado ningún taller.</p>
                    <Button asChild variant="link">
                        <Link href="/dashboard/register-workshop">¡Registra tu taller!</Link>
                    </Button>
                </div>
            )}
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calendar/> Mis Citas</CardTitle>
                <CardDescription>Aquí puedes ver y gestionar tus próximas citas.</CardDescription>
            </CardHeader>
            <CardContent>
                 {appointments && appointments.length > 0 ? (
                    <div className="space-y-4">
                        {appointments.sort((a, b) => new Date(a.appointmentDateTime).getTime() - new Date(b.appointmentDateTime).getTime()).map((appointment) => (
                            <Card key={appointment.id} className="p-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold capitalize">{format(new Date(appointment.appointmentDateTime), "EEEE, d 'de' MMMM", { locale: es })}</p>
                                        <p className="text-sm text-muted-foreground">Taller: ID {appointment.workshopId}</p>
                                    </div>
                                    <Badge variant={appointment.status === 'scheduled' ? 'default' : 'secondary'}>{appointment.status}</Badge>
                                </div>
                                <div className="flex justify-between items-end mt-2 gap-4">
                                  <p className="text-sm p-3 bg-muted rounded-md flex-grow">{appointment.description}</p>
                                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleCancelAppointment(appointment.id)}>
                                    <Trash2 className="h-5 w-5" />
                                    <span className="sr-only">Cancelar Cita</span>
                                  </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">No tienes ninguna cita programada.</p>
                         <Button asChild variant="link">
                            <Link href="/#workshops">¡Busca un taller y agenda una!</Link>
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Settings /> Configuración de la Cuenta</CardTitle>
                <CardDescription>Gestiona las opciones de tu cuenta.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-start gap-4">
                <Button onClick={handleLogout} variant="outline">
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar Sesión
                </Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={user.isAnonymous}>Eliminar Cuenta</Button>
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
                {user.isAnonymous && <p className="text-xs text-muted-foreground">Debes tener una cuenta permanente para poder eliminarla.</p>}
            </CardContent>
        </Card>
      </div>

    </div>
  );
}
