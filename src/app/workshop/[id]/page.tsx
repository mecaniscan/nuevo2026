'use client';
import * as React from 'react';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useDoc, useUser, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, where, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { Workshop, Appointment, Service, Review } from '@/lib/types';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Loader2, MapPin, ScanLine, Star, Calendar as CalendarIcon, Wrench, MessageSquare, Send } from 'lucide-react';
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
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';
import { useAuth } from '@/firebase';
import Link from 'next/link';
import { es } from 'date-fns/locale';

const appointmentSchema = z.object({
    appointmentDateTime: z.date({
        required_error: 'Se requiere una fecha para la cita.',
    }),
    description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres.'),
});

const reviewSchema = z.object({
  rating: z.number().min(1, "Debes seleccionar al menos una estrella.").max(5),
  comment: z.string().min(10, "La reseña debe tener al menos 10 caracteres.").max(500, "La reseña no puede exceder los 500 caracteres."),
});


export default function WorkshopDetailPage() {
    const params = useParams();
    const workshopId = params.id as string;
    const { toast } = useToast();
    const router = useRouter();

    const { user, isUserLoading } = useUser();
    const auth = useAuth();
    const firestore = useFirestore();

    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isSubmittingReview, setIsSubmittingReview] = React.useState(false);

    // Fetch Workshop
    const workshopRef = useMemoFirebase(() => {
        if (!firestore || !workshopId) return null;
        return doc(firestore, 'workshops', workshopId);
    }, [firestore, workshopId]);
    const { data: workshopData, isLoading: isWorkshopLoading } = useDoc<Workshop>(workshopRef);
    
    // Fetch Master Services
    const servicesCollection = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'services');
      }, [firestore]);
    const { data: masterServices, isLoading: isServicesLoading } = useCollection<Service>(servicesCollection);
    
    // Fetch Reviews
    const reviewsCollection = useMemoFirebase(() => {
        if (!firestore || !workshopId) return null;
        return collection(firestore, `workshops/${workshopId}/reviews`);
      }, [firestore, workshopId]);
    const { data: reviews, isLoading: areReviewsLoading } = useCollection<Review>(reviewsCollection);

    const userHasReviewed = useMemo(() => {
        if (!user || !reviews) return false;
        return reviews.some(review => review.userId === user.uid);
    }, [user, reviews]);


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

    const workshopServices = useMemo(() => {
        if (!workshopData || !masterServices) return [];
        return masterServices.filter(service => workshopData.serviceIds?.includes(service.id));
    }, [workshopData, masterServices]);

    const workshop = useMemo(() => {
        if (!workshopData) return null;
        return {
          ...workshopData,
          city: "Metropolis",
          rating: workshopData.averageRating || 4.5,
          reviewCount: workshopData.reviewCount || 50,
          services: workshopServices,
          image: PlaceHolderImages.find(p => p.id.startsWith('workshop')) || PlaceHolderImages[1],
        };
    }, [workshopData, workshopServices]);

    const handleLogin = () => {
        initiateAnonymousSignIn(auth);
    };

    async function onAppointmentSubmit(values: z.infer<typeof appointmentSchema>) {
        if (!user || !firestore || !workshopId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Debes iniciar sesión para agendar una cita.' });
            return;
        }
        setIsSubmitting(true);
        

        try {
            const appointmentsCollection = collection(firestore, 'users', user.uid, 'appointments');
            const appointmentData: Omit<Appointment, 'id'> = {
                appointmentDateTime: values.appointmentDateTime.toISOString(),
                workshopId: workshopId,
                userId: user.uid,
                status: 'scheduled',
                description: values.description,
            };
            
            addDocumentNonBlocking(appointmentsCollection, appointmentData);

            toast({
                title: '¡Cita Agendada!',
                description: `Tu cita en ${workshop?.name} ha sido programada.`,
            });
            router.push('/dashboard');
        } catch (error) {
            console.error('Error creating appointment:', error);
            toast({
                variant: 'destructive',
                title: 'Error Inesperado',
                description: 'No se pudo agendar la cita. Por favor, intenta de nuevo.',
            });
        } finally {
            setIsSubmitting(false);
        }
    }
    
    async function onReviewSubmit(values: z.infer<typeof reviewSchema>) {
      if (!user || !firestore || !workshopId) {
        toast({ variant: "destructive", title: "Error", description: "Debes iniciar sesión para dejar una reseña." });
        return;
      }
      if (userHasReviewed) {
        toast({ variant: "destructive", title: "Acción no permitida", description: "Ya has dejado una reseña para este taller." });
        return;
      }
      setIsSubmittingReview(true);
      try {
        const reviewCollection = collection(firestore, `workshops/${workshopId}/reviews`);
        const reviewData = {
          ...values,
          workshopId,
          userId: user.uid,
          authorName: user.displayName || user.email,
          createdAt: serverTimestamp(),
        };

        addDocumentNonBlocking(reviewCollection, reviewData);
        
        // This should be a transaction in a real app to update average rating
        // For now, we will just add the review

        toast({
          title: "¡Reseña Enviada!",
          description: "Gracias por compartir tu opinión.",
        });
        reviewForm.reset({rating: 0, comment: ""});

      } catch (error) {
        console.error("Error submitting review:", error);
        toast({
          variant: "destructive",
          title: "Error Inesperado",
          description: "No se pudo enviar tu reseña. Intenta de nuevo.",
        });
      } finally {
        setIsSubmittingReview(false);
      }
    }

    const formatDate = (dateValue: string | Timestamp) => {
        if (!dateValue) return '';
        const date = (dateValue as Timestamp)?.toDate ? (dateValue as Timestamp).toDate() : new Date(dateValue);
        return format(date, 'dd MMM yyyy', { locale: es });
    };

    if (isWorkshopLoading || isUserLoading || isServicesLoading || areReviewsLoading) {
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
                <div className="relative h-96 w-full rounded-xl overflow-hidden shadow-lg">
                    <Image
                        src={workshop.image.imageUrl}
                        alt={workshop.image.description}
                        fill
                        className="object-cover"
                        data-ai-hint={workshop.image.imageHint}
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                    <div className="absolute bottom-0 left-0 p-6">
                        <h1 className="text-4xl font-headline font-bold text-white shadow-text">{workshop.name}</h1>
                        <div className="flex items-center gap-2 text-sm text-white/90 mt-2">
                            <MapPin className="h-4 w-4 shrink-0" /> 
                            <span>{workshop.address}, {workshop.city}</span>
                        </div>
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
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-1.5">
                                <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
                                <span className="font-bold text-foreground text-lg">{workshop.rating.toFixed(1)}</span>
                                <span className="text-sm text-muted-foreground">({workshop.reviewCount} reseñas)</span>
                            </div>
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg mb-3">Servicios Ofrecidos</h3>
                            <div className="flex flex-wrap gap-3">
                                {workshop.services.map(service => (
                                    <Badge key={service.id} variant="secondary" className="text-base px-4 py-2 flex items-center gap-2">
                                        <Wrench className="h-4 w-4" /> {service.name} (${service.price})
                                    </Badge>
                                ))}
                            </div>
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
                        <Form {...appointmentForm}>
                            <form onSubmit={appointmentForm.handleSubmit(onAppointmentSubmit)} className="space-y-6">
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
                                                disabled={(date) =>
                                                    date < new Date(new Date().toDateString())
                                                }
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
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Confirmar Cita'}
                                </Button>
                            </form>
                        </Form>
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
