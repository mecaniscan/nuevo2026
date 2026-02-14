'use client';
import React from 'react';
import { useUser, useFirestore, useMemoFirebase, useCollection, FirestorePermissionError, errorEmitter } from '@/firebase';
import { collection, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import type { FavoriteWorkshop } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Star, Trash2, Heart, MapPin, Search, Car } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
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

export default function MyFavoritesPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const favoritesQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, `users/${user.uid}/favorites`), orderBy('addedAt', 'desc'));
  }, [firestore, user?.uid]);

  const { data: favorites, isLoading: areFavoritesLoading } = useCollection<FavoriteWorkshop>(favoritesQuery);

  const handleRemoveFavorite = (workshopId: string) => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'No autenticado.' });
      return;
    }
    const docRef = doc(firestore, `users/${user.uid}/favorites`, workshopId);
    deleteDoc(docRef)
        .then(() => {
            toast({
              title: 'Taller Eliminado',
              description: 'El taller ha sido eliminado de tus favoritos.',
            });
        })
        .catch(() => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: docRef.path,
                operation: 'delete'
            }));
        });
  };

  const isLoading = isUserLoading || areFavoritesLoading;

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
            <CardDescription>Debes iniciar sesión para ver tus favoritos.</CardDescription>
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
              <Heart /> Mis Talleres Favoritos
            </h1>
            <p className="text-muted-foreground">Accede rápidamente a los talleres que has guardado.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild>
                <Link href="/#workshops"><Search className="mr-2 h-4 w-4"/>Buscar Talleres</Link>
            </Button>
            <Button variant="ghost" asChild>
                <Link href="/dashboard">Volver al Panel</Link>
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Talleres Guardados</CardTitle>
            <CardDescription>
              Aquí puedes ver todos los talleres que has marcado como favoritos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-60 items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
              </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {favorites && favorites.length > 0 ? (
                    favorites.map((fav) => (
                        <Card key={fav.workshopId} className="group relative overflow-hidden">
                            <Link href={`/workshop/${fav.workshopId}`} className="block">
                                <div className="relative h-48 w-full bg-muted flex items-center justify-center">
                                    {fav.imageUrl ? (
                                        <Image src={fav.imageUrl} alt={fav.name} fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
                                    ) : (
                                        <Car className="h-16 w-16 text-muted-foreground"/>
                                    )}
                                </div>
                                <div className="p-4">
                                    <h3 className="font-semibold text-lg truncate group-hover:text-primary">{fav.name}</h3>
                                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                        <MapPin className="h-4 w-4 shrink-0" />
                                        <span className="truncate">{fav.address}</span>
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-2">
                                        <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                                        <span className="font-bold text-foreground">{(fav.averageRating || 0).toFixed(1)}</span>
                                    </div>
                                </div>
                            </Link>
                            <div className="absolute top-2 right-2">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="icon" className="h-9 w-9 opacity-80 group-hover:opacity-100 transition-opacity">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>¿Eliminar de Favoritos?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Esta acción eliminará "{fav.name}" de tu lista de talleres favoritos.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction
                                            onClick={() => handleRemoveFavorite(fav.workshopId)}
                                            className="bg-destructive hover:bg-destructive/90"
                                            >
                                            Sí, Eliminar
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </Card>
                    ))
                  ) : (
                    <div className="col-span-full h-40 flex flex-col items-center justify-center text-center p-4 bg-muted rounded-lg">
                        <p className="text-lg font-medium">No tienes talleres favoritos todavía.</p>
                        <p className="text-muted-foreground">Explora los talleres y haz clic en el corazón para guardarlos.</p>
                        <Button variant="link" asChild className="mt-2">
                           <Link href="/#workshops">¡Busca un taller!</Link>
                        </Button>
                      </div>
                  )}
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
