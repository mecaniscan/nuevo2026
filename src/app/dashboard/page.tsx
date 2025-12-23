'use client';

import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { Workshop } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const workshopsCollection = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'workshops');
  }, [firestore, user]);

  const userWorkshopsQuery = useMemoFirebase(() => {
    if (!workshopsCollection || !user) return null;
    return query(workshopsCollection, where('ownerId', '==', user.uid));
  }, [workshopsCollection, user]);

  const { data: workshops, isLoading: isWorkshopsLoading } = useCollection<Workshop>(userWorkshopsQuery);

  if (isUserLoading || isWorkshopsLoading) {
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
                <CardHeader>
                    <CardTitle>Acceso Denegado</CardTitle>
                    <CardDescription>Debes iniciar sesión para ver tu panel de control.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Link href="/" className="text-primary hover:underline">Volver a la página principal</Link>
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

      <Card>
        <CardHeader>
          <CardTitle>Mis Talleres</CardTitle>
          <CardDescription>Aquí puedes ver y gestionar los talleres que has registrado.</CardDescription>
        </CardHeader>
        <CardContent>
          {workshops && workshops.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workshops.map((workshop) => (
                <Card key={workshop.id}>
                  <CardHeader>
                    <CardTitle>{workshop.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{workshop.address}</p>
                  </CardContent>
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
    </div>
  );
}
