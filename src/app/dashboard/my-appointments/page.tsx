'use client';
import React from 'react';
import { useUser, useFirestore, useMemoFirebase, useCollection, FirestorePermissionError, errorEmitter } from '@/firebase';
import { collection, query, where, Timestamp, doc, deleteDoc } from 'firebase/firestore';
import type { Appointment } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, Trash2 } from 'lucide-react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function MyAppointmentsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const appointmentsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null; // Ensure user and user.uid are available
    return query(collection(firestore, 'appointments'), where('userId', '==', user.uid));
  }, [firestore, user?.uid]);

  const { data: appointments, isLoading: areAppointmentsLoading } = useCollection<Appointment>(appointmentsQuery);

  const handleDeleteAppointment = (appointmentId: string) => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'No autenticado.' });
      return;
    }
    const docRef = doc(firestore, `appointments`, appointmentId);
    
    deleteDoc(docRef)
        .then(() => {
            toast({
                title: 'Cita Cancelada',
                description: 'La cita ha sido eliminada de tu agenda.',
            });
        })
        .catch(() => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: docRef.path,
                operation: 'delete'
            }));
        });
  };

  const formatDate = (dateString: string) => {
    try {
        const date = new Date(dateString);
        if(isNaN(date.getTime())) throw new Error('Invalid date');
        return format(date, "eeee, dd 'de' MMMM 'de' yyyy", { locale: es });
    } catch(e) {
        return "Fecha inválida";
    }
  };

  const getStatusBadge = (status: Appointment['status']) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="default">Programada</Badge>;
      case 'completed':
        return <Badge variant="secondary">Completada</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isLoading = isUserLoading || areAppointmentsLoading;

  if (isLoading && !appointments) { // Show loader only on initial load
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
            <CardDescription>Debes iniciar sesión para ver tus citas.</CardDescription>
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
            <h1 className="text-3xl font-bold font-headline text-primary flex items-center gap-2">
              <Calendar /> Citas por WhatsApp
            </h1>
            <p className="text-muted-foreground">Consulta y gestiona tus citas con los talleres.</p>
          </div>
          <Button variant="ghost" asChild>
            <Link href="/dashboard">Volver al Panel</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Historial de Citas</CardTitle>
            <CardDescription>
              Aquí puedes ver todas tus citas programadas, completadas o canceladas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-60 items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Taller</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments && appointments.length > 0 ? (
                    appointments.map((appointment) => (
                      <TableRow key={appointment.id}>
                        <TableCell className="font-medium">
                           <Link href={`/workshop/${appointment.workshopId}`} className="hover:underline text-primary">
                            {appointment.workshopName}
                           </Link>
                        </TableCell>
                        <TableCell>{formatDate(appointment.appointmentDateTime)}</TableCell>
                        <TableCell>{getStatusBadge(appointment.status)}</TableCell>
                        <TableCell className="max-w-xs truncate">{appointment.description}</TableCell>
                        <TableCell className="text-right">
                           {appointment.status === 'scheduled' && (
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Estás seguro de cancelar la cita?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta acción no se puede deshacer. Se notificará al taller sobre la cancelación.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cerrar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteAppointment(appointment.id)}
                                      className="bg-destructive hover:bg-destructive/90"
                                    >
                                      Sí, Cancelar Cita
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                           )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        No tienes ninguna cita agendada todavía.
                        <Button variant="link" asChild className="ml-2">
                           <Link href="/#workshops">¡Busca un taller!</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
