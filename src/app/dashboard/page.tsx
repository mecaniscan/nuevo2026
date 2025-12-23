'use client';

import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { Workshop, Appointment } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, Wrench } from 'lucide-react';
import Link from 'next/link';
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';
import { useAuth } from '@/firebase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();

  const handleLogin = () => {
    initiateAnonymousSignIn(auth);
  };

  // Fetch Workshops
  const workshopsCollection = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'workshops');
  }, [firestore, user]);

  const userWorkshopsQuery = useMemoFirebase(() => {
    if (!workshopsCollection || !user) return null;
    return query(workshopsCollection, where('ownerId', '==', user.uid));
  }, [workshopsCollection, user]);

  const { data: workshops, isLoading: isWorkshopsLoading } = useCollection<Workshop>(userWorkshopsQuery);

  // Fetch Appointments
  const appointmentsCollection = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.uid, 'appointments');
  }, [firestore, user]);

  const { data: appointments, isLoading: isAppointmentsLoading } = useCollection<Appointment>(appointmentsCollection);

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
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <CardTitle>Acceso Denegado</CardTitle>
                    <CardDescription>Debes iniciar sesión para ver tu panel de control.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <Button onClick={handleLogin}>Iniciar Sesión</Button>
                    <Button variant="link" asChild>
                      <Link href="/">Volver a la página principal</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="container mx-auto py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold font-headline text-primary">Tu Panel de Control</h1>
        <Button asChild>
            <Link href="/dashboard/register-workshop">Añadir Nuevo Taller</Link>
        </Button>
      </div>
      
      <div className="grid gap-8 lg:grid-cols-2">
        {/* My Workshops */}
        <Card>
            <CardHeader>
            <CardTitle className="flex items-center gap-2"><Wrench/> Mis Talleres</CardTitle>
            <CardDescription>Aquí puedes ver y gestionar los talleres que has registrado.</CardDescription>
            </CardHeader>
            <CardContent>
            {workshops && workshops.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                {workshops.map((workshop) => (
                    <Card key={workshop.id} className="p-4">
                        <CardTitle className="text-lg">{workshop.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{workshop.address}</p>
                    </Card>
                ))}
                </div>
            ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">Aún no has registrado ningún taller.</p>
                    <Button asChild variant="link">
                        <Link href="/dashboard/register-workshop">¡Registra tu primer taller!</Link>
                    </Button>
                </div>
            )}
            </CardContent>
        </Card>

        {/* My Appointments */}
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calendar/> Mis Citas</CardTitle>
                <CardDescription>Aquí puedes ver tus próximas citas.</CardDescription>
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
                                <p className="text-sm mt-2 p-3 bg-muted rounded-md">{appointment.description}</p>
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
      </div>

    </div>
  );
}
