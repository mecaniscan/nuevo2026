'use client';
import * as React from 'react';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useDoc, useUser, useFirestore, useMemoFirebase, useCollection, FirestorePermissionError, errorEmitter } from '@/firebase';
import { doc, collection, query, serverTimestamp, Timestamp, writeBatch, deleteDoc, setDoc, addDoc, runTransaction } from 'firebase/firestore';
import type { Workshop, Appointment, Service, Review, FavoriteWorkshop, Vehicle } from '@/lib/types';
import { Loader2, MapPin, ScanLine, Star, Calendar as CalendarIcon, Wrench, MessageSquare, Send, Heart, Phone, Car } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { es } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const appointmentSchema = z.object({
    vehicleId: z.string({ required_error: 'Debes seleccionar un vehículo.' }),
    appointmentDateTime: z.date({
        required_error: 'Se requiere una fecha para la cita.',
    }),
    description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres.'),
});

const reviewSchema = z.object({
  rating: z.number().min(1, "Debes seleccionar al menos una estrella.").max(5),
  comment: z.string().min(10, "La reseña debe tener al menos 10 caracteres.").max(500, "La reseña no puede exceder los 500 caracteres."),
});

const WhatsappIcon = () => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-current"><title>WhatsApp</title><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 2.52 5.079 3.556.718.255 1.299.408 1.74.527.534.142 1.028.12 1.425.074.446-.05 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 5.451 0 9.885 4.434 9.889 9.884.002 5.45-4.433 9.884-9.889 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892.157 14.66.965 17.165 2.63 19.05l-2.63 9.95 10.193-2.685a11.815 11.815 0 005.655 1.5l.004-.001h.004c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
);


export default function WorkshopDetailPage() {
    const params = useParams();
    const workshopId = params.id as string;
    const { toast } = useToast();
    const router = useRouter();

    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isSubmittingReview, setIsSubmittingReview] = React.useState(false);
    const [isClient, setIsClient] = React.useState(false);

    React.useEffect(() => {
        setIsClient(true);
    }, []);

    // Fetch Workshop
    const workshopRef = useMemoFirebase(() => {
        if (!firestore || !workshopId) return null;
        return doc(firestore, 'workshops', workshopId);
    }, [firestore, workshopId]);
    const { data: workshopData, isLoading: isWorkshopLoading } = useDoc<Workshop>(workshopRef);
    
    // Fetch Workshop Services
    const workshopServicesCollection = useMemoFirebase(() => {
        if (!firestore || !workshopId) return null;
        return collection(firestore, `workshops/${workshopId}/services`);
      }, [firestore, workshopId]);
    const { data: workshopServices, isLoading: isServicesLoading } = useCollection<Service>(workshopServicesCollection);
    
    // Fetch Reviews
    const reviewsCollection = useMemoFirebase(() => {
        if (!firestore || !workshopId) return null;
        return collection(firestore, `workshops/${workshopId}/reviews`);
      }, [firestore, workshopId]);
    const { data: reviews, isLoading: areReviewsLoading } = useCollection<Review>(reviewsCollection);

    // Fetch User's Vehicles
    const vehiclesCollectionRef = useMemoFirebase(() => {
        if (!firestore || !user?.uid) return null;
        return collection(firestore, `users/${user.uid}/vehicles`);
    }, [firestore, user?.uid]);
    const { data: vehicles, isLoading: areVehiclesLoading } = useCollection<Vehicle>(vehiclesCollectionRef);

    const userHasReviewed = useMemo(() => {
        if (!user || !reviews) return false;
        return reviews.some(review => review.userId === user.uid);
    }, [user, reviews]);

    // Fetch User Favorites
    const favoriteRef = useMemoFirebase(() => {
        if (!firestore || !user?.uid || !workshopId) return null;
        return doc(firestore, `users/${user.uid}/favorites`, workshopId);
    }, [firestore, user?.uid, workshopId]);
    const { data: favorite, isLoading: isFavoriteLoading } = useDoc<FavoriteWorkshop>(favoriteRef);
    const isFavorite = !!favorite;

    const appointmentForm = useForm<z.infer<typeof appointmentSchema>>({
        resolver: zodResolver(appointmentSchema),
        defaultValues: {
            description: '',
        },
    });

    const reviewForm = useForm<z.infer<typeof reviewSchema>>({
      resolver: zodResolver(reviewSchema),
      defaultValues: {
        rating: 0,
        comment: "",
      }
    });

    const workshop = useMemo(() => {
        if (!workshopData) return null;
        return {
          ...workshopData,
          reviewCount: workshopData.reviewCount || 0,
          averageRating: workshopData.averageRating || 0,
          services: workshopServices || [],
        };
    }, [workshopData, workshopServices]);

    const handleLogin = () => {
        router.push('/login');
    };

    const toggleFavorite = async () => {
        if (!firestore || !user || !workshopId || !workshop) {
            toast({ variant: 'destructive', title: 'Error', description: 'Debes iniciar sesión para guardar favoritos.' });
            return;
        }

        const favRef = doc(firestore, `users/${user.uid}/favorites`, workshopId);

        if (isFavorite) {
            deleteDoc(favRef)
                .then(() => {
                    toast({ title: 'Eliminado de Favoritos', description: `${workshop.name} ha sido eliminado de tu lista.` });
                })
                .catch(() => {
                    errorEmitter.emit('permission-error', new FirestorePermissionError({
                        path: favRef.path,
                        operation: 'delete'
                    }));
                });
        } else {
            const favoriteData: FavoriteWorkshop = {
                workshopId,
                name: workshop.name,
                address: workshop.address,
                imageUrl: workshop.imageUrl || '',
                averageRating: workshop.averageRating || 0,
                addedAt: serverTimestamp() as Timestamp,
            };
            setDoc(favRef, favoriteData)
                .then(() => {
                    toast({ title: '¡Guardado en Favoritos!', description: `${workshop.name} ha sido añadido a tu lista.` });
                })
                .catch(() => {
                    errorEmitter.emit('permission-error', new FirestorePermissionError({
                        path: favRef.path,
                        operation: 'create',
                        requestResourceData: favoriteData
                    }));
                });
        }
    };


    function onAppointmentSubmit(values: z.infer<typeof appointmentSchema>) {
        if (!workshop || !workshop.whatsappNumber || !user || !firestore || !vehicles) {
            toast({ variant: 'destructive', title: 'Error', description: 'Falta información para agendar la cita.' });
            return;
        }

        setIsSubmitting(true);
        
        const appointmentData: Omit<Appointment, 'id'> = {
            workshopId: workshop.id,
            workshopName: workshop.name,
            userId: user.uid,
            vehicleId: '', // placeholder
            vehicleName: '', // placeholder
            appointmentDateTime: values.appointmentDateTime.toISOString(),
            description: values.description,
            status: 'scheduled',
        };

        
        const selectedVehicle = vehicles.find(v => v.id === values.vehicleId);
        if (!selectedVehicle) {
            toast({ variant: 'destructive', title: 'Error', description: 'Vehículo seleccionado no válido.' });
            setIsSubmitting(false);
            return;
        }
        appointmentData.vehicleId = selectedVehicle.id;
        appointmentData.vehicleName = `${selectedVehicle.brand} ${selectedVehicle.model}`;

        addDoc(collection(firestore, 'appointments'), appointmentData)
            .then(() => {
                const date = format(values.appointmentDateTime, "eeee, dd 'de' MMMM 'de' yyyy", { locale: es });
                const message = `Hola ${workshop.name}, me gustaría agendar una cita para mi ${selectedVehicle.brand} ${selectedVehicle.model} el día ${date}. El motivo es: "${values.description}". ¿Tienen disponibilidad?`;
                const whatsappUrl = `https://wa.me/${workshop.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
                
                window.open(whatsappUrl, '_blank');
                
                toast({
                    title: '¡Cita Registrada!',
                    description: 'Redirigiendo a WhatsApp para que confirmes tu cita con el taller.',
                });
                appointmentForm.reset();
                router.push('/dashboard/my-appointments');
            })
            .catch(() => {
                 errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: 'appointments',
                    operation: 'create',
                    requestResourceData: appointmentData,
                }));
            })
            .finally(() => {
                setIsSubmitting(false);
            });
    }
    
    async function onReviewSubmit(values: z.infer<typeof reviewSchema>) {
        if (!user || !firestore || !workshopId || !workshopRef) {
            toast({ variant: "destructive", title: "Error", description: "Debes iniciar sesión para dejar una reseña." });
            return;
        }
        if (userHasReviewed) {
            toast({ variant: "destructive", title: "Acción no permitida", description: "Ya has dejado una reseña para este taller." });
            return;
        }
        setIsSubmittingReview(true);
      
        const reviewRef = doc(firestore, `workshops/${workshopId}/reviews`, user.uid);

        try {
            await runTransaction(firestore, async (transaction) => {
                const workshopDoc = await transaction.get(workshopRef);
                if (!workshopDoc.exists()) {
                    throw "El taller no existe.";
                }

                // Check if review already exists inside transaction for race conditions
                const existingReviewDoc = await transaction.get(reviewRef);
                if (existingReviewDoc.exists()) {
                    throw new Error("Ya has dejado una reseña para este taller.");
                }

                const currentData = workshopDoc.data();
                const currentReviewCount = currentData.reviewCount || 0;
                const currentAverageRating = currentData.averageRating || 0;

                const newReviewCount = currentReviewCount + 1;
                const newAverageRating = (currentAverageRating * currentReviewCount + values.rating) / newReviewCount;

                transaction.update(workshopRef, {
                    reviewCount: newReviewCount,
                    averageRating: newAverageRating
                });

                const reviewData: Omit<Review, 'id' | 'createdAt'> & { createdAt: any } = {
                    ...values,
                    workshopId,
                    userId: user.uid,
                    authorName: user.displayName || user.email,
                    createdAt: serverTimestamp(),
                };
                transaction.set(reviewRef, reviewData);
            });

            toast({
                title: "¡Reseña Enviada!",
                description: "Gracias por compartir tu opinión.",
            });
            reviewForm.reset({rating: 0, comment: ""});

        } catch (error: any) {
            if (error.message === "Ya has dejado una reseña para este taller.") {
                 toast({
                    variant: "destructive",
                    title: "Acción no permitida",
                    description: error.message,
                });
            } else {
                 const reviewData = {
                    ...values,
                    workshopId,
                    userId: user.uid,
                    authorName: user.displayName || user.email,
                };
                 errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: reviewRef.path,
                    operation: 'create',
                    requestResourceData: reviewData
                }));
            }
        } finally {
            setIsSubmittingReview(false);
        }
    }

    const formatDate = (dateValue: string | Timestamp | undefined) => {
        if (!dateValue) return 'Fecha no disponible';
        try {
            const date = (dateValue as Timestamp)?.toDate ? (dateValue as Timestamp).toDate() : new Date(dateValue);
            if(isNaN(date.getTime())) throw new Error('Invalid date');
            return format(date, 'dd MMM yyyy', { locale: es });
        } catch(e) {
            return "Fecha inválida";
        }
    };

    if (isWorkshopLoading || isUserLoading || isServicesLoading || areReviewsLoading || isFavoriteLoading || areVehiclesLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }

    if (!workshop) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold">Taller no encontrado</h1>
                    <p className="text-muted-foreground">No pudimos encontrar el taller que estás buscando.</p>
                    <Button asChild variant="link">
                        <Link href="/">Volver al inicio</Link>
                    </Button>
                </div>
            </div>
        );
    }

  return (
    <div className="container mx-auto py-12 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-8">
                {/* Image Header */}
                <div className="relative h-96 w-full rounded-xl overflow-hidden shadow-lg bg-muted flex items-center justify-center">
                    {workshop.imageUrl ? (
                        <Image
                            src={workshop.imageUrl}
                            alt={workshop.name}
                            fill
                            className="object-cover"
                            priority
                        />
                    ) : (
                        <Car className="h-24 w-24 text-muted-foreground"/>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                    <div className="absolute bottom-0 left-0 p-6 w-full flex justify-between items-end">
                        <div>
                            <h1 className="text-4xl font-headline font-bold text-white shadow-text">{workshop.name}</h1>
                            <div className="flex items-center gap-2 text-sm text-white/90 mt-2">
                                <MapPin className="h-4 w-4 shrink-0" /> 
                                <span>{workshop.address}</span>
                            </div>
                        </div>
                        {user && !user.isAnonymous && (
                            <Button size="icon" variant="secondary" onClick={toggleFavorite} className="rounded-full h-12 w-12 shrink-0">
                                <Heart className={cn("h-6 w-6 transition-all", isFavorite ? "text-red-500 fill-red-500" : "text-muted-foreground")} />
                                <span className="sr-only">Añadir a favoritos</span>
                            </Button>
                        )}
                     
                    </div>
                    {workshop.obdScannerService && (
                        <Badge variant="default" className="absolute top-4 right-4 bg-accent text-accent-foreground border-transparent shadow-md">
                            <ScanLine className="mr-1.5 h-4 w-4" /> Escáner OBD-II
                        </Badge>
                    )}
                </div>
                
                {/* Details Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Acerca de {workshop.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <p className="text-muted-foreground">{workshop.description}</p>
                        <div className="flex items-center gap-6 flex-wrap">
                            <div className="flex items-center gap-1.5">
                                <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
                                <span className="font-bold text-foreground text-lg">{(workshop.averageRating || 0).toFixed(1)}</span>
                                <span className="text-sm text-muted-foreground">({(workshop.reviewCount || 0)} reseñas)</span>
                            </div>
                             <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Phone className="h-4 w-4" /> {workshop.contactNumber}
                            </div>
                            {workshop.whatsappNumber && (
                                <a
                                href={`https://wa.me/${workshop.whatsappNumber.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
                                >
                                <WhatsappIcon /> {workshop.whatsappNumber}
                                </a>
                            )}
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg mb-3">Servicios Ofrecidos</h3>
                             {workshop.services.length > 0 ? (
                                <div className="flex flex-wrap gap-3">
                                {workshop.services.map(service => (
                                    <Badge key={service.id} variant="secondary" className="text-base px-4 py-2 flex items-center gap-2">
                                        <Wrench className="h-4 w-4" /> {service.name} (${service.price})
                                    </Badge>
                                ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">Este taller aún no ha especificado sus servicios.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
                 {/* Reviews Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><MessageSquare/> Reseñas de Clientes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {user && !user.isAnonymous && (
                          <>
                            {userHasReviewed ? (
                                <div className="p-4 text-center bg-muted rounded-lg">
                                    <p className="text-muted-foreground">Ya has dejado una reseña para este taller.</p>
                                </div>
                            ) : (
                              <Form {...reviewForm}>
                                 <form onSubmit={reviewForm.handleSubmit(onReviewSubmit)} className="space-y-4 p-4 border rounded-lg bg-card/30">
                                    <FormLabel>Deja tu reseña</FormLabel>
                                    <FormField
                                      control={reviewForm.control}
                                      name="rating"
                                      render={({ field }) => (
                                        <FormItem className="flex items-center gap-2">
                                          <FormLabel>Calificación:</FormLabel>
                                           <div className="flex">
                                              {[1, 2, 3, 4, 5].map((star) => (
                                                <Star
                                                  key={star}
                                                  className={cn("h-6 w-6 cursor-pointer", field.value >= star ? "text-amber-400 fill-amber-400" : "text-muted-foreground")}
                                                  onClick={() => field.onChange(star)}
                                                />
                                              ))}
                                          </div>
                                          <FormMessage/>
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={reviewForm.control}
                                      name="comment"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormControl>
                                            <Textarea placeholder="Comparte tu experiencia con este taller..." {...field}/>
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <Button type="submit" disabled={isSubmittingReview}>
                                      {isSubmittingReview ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4" />}
                                      Enviar Reseña
                                    </Button>
                                </form>
                              </Form>
                            )}
                          </>
                        )}
                        <div className="space-y-4">
                            {reviews && reviews.length > 0 ? (
                                reviews.map(review => (
                                <div key={review.id} className="p-4 border-b">
                                    <div className="flex justify-between items-center">
                                      <p className="font-semibold">{review.authorName || 'Anónimo'}</p>
                                      <div className="flex items-center">
                                          {[...Array(review.rating)].map((_, i) => <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400"/>)}
                                          {[...Array(5 - review.rating)].map((_, i) => <Star key={i} className="h-4 w-4 text-muted-foreground"/>)}
                                      </div>
                                    </div>
                                    <p className="text-muted-foreground mt-2">{review.comment}</p>
                                    <p className="text-xs text-muted-foreground mt-2">{formatDate(review.createdAt)}</p>
                                </div>
                                ))
                            ) : (
                                <p className="text-muted-foreground text-center">Todavía no hay reseñas para este taller. ¡Sé el primero!</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            {/* Appointment Form */}
            <div className="lg:col-span-1">
                <Card className="sticky top-24 shadow-xl">
                    <CardHeader>
                        <CardTitle>Agendar una Cita</CardTitle>
                        <CardDescription>Selecciona una fecha y describe el problema de tu vehículo.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {user ? (
                            (!vehicles || vehicles.length === 0) ? (
                                <div className="flex flex-col items-center justify-center text-center space-y-4 p-8 border-2 border-dashed rounded-lg">
                                    <p className="text-muted-foreground">Debes tener al menos un vehículo registrado para agendar una cita.</p>
                                    <Button asChild>
                                        <Link href="/dashboard/my-vehicles">Registrar mi Vehículo</Link>
                                    </Button>
                                </div>
                            ) : (
                                <Form {...appointmentForm}>
                                    <form onSubmit={appointmentForm.handleSubmit(onAppointmentSubmit)} className="space-y-6">
                                        <FormField
                                            control={appointmentForm.control}
                                            name="vehicleId"
                                            render={({ field }) => (
                                                <FormItem>
                                                <FormLabel>Selecciona tu Vehículo</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Elige tu vehículo" />
                                                    </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                    {vehicles.map(vehicle => (
                                                        <SelectItem key={vehicle.id} value={vehicle.id}>
                                                        {vehicle.brand} {vehicle.model} ({vehicle.year})
                                                        </SelectItem>
                                                    ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={appointmentForm.control}
                                            name="appointmentDateTime"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-col">
                                                <FormLabel>Fecha de la Cita</FormLabel>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                        variant={"outline"}
                                                        className={cn(
                                                            "w-full pl-3 text-left font-normal",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                        >
                                                        {field.value ? (
                                                            format(field.value, "PPP", { locale: es })
                                                        ) : (
                                                            <span>Elige una fecha</span>
                                                        )}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={field.value}
                                                        onSelect={field.onChange}
                                                        disabled={isClient ? (date) => date < new Date(new Date().setHours(0, 0, 0, 0)) : true}
                                                        initialFocus
                                                    />
                                                    </PopoverContent>
                                                </Popover>
                                                <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={appointmentForm.control}
                                            name="description"
                                            render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Describe el servicio que necesitas</FormLabel>
                                                <FormControl>
                                                <Textarea placeholder="Ej: El auto hace un ruido extraño al frenar, necesito una revisión de frenos." {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                            )}
                                        />
                                        <Button type="submit" disabled={isSubmitting} className="w-full">
                                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <WhatsappIcon />}
                                            Contactar por WhatsApp para Agendar
                                        </Button>
                                    </form>
                                </Form>
                            )
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center space-y-4 p-8 border-2 border-dashed rounded-lg">
                                <p className="text-muted-foreground">Debes iniciar sesión para poder agendar una cita.</p>
                                <Button onClick={handleLogin}>Iniciar Sesión</Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
  );
}
