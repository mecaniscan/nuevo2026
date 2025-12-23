'use client';
import * as React from 'react';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useDoc, useUser, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import type { Workshop, Appointment, Service } from '@/lib/types';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Loader2, MapPin, ScanLine, Star, Calendar as CalendarIcon, Wrench } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const appointmentSchema = z.object({
    appointmentDateTime: z.date({
        required_error: 'Se requiere una fecha para la cita.',
    }),
    serviceId: z.string({ required_error: 'Debes seleccionar un servicio.'}),
    description: z.string().optional(),
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


    const form = useForm<z.infer<typeof appointmentSchema>>({
        resolver: zodResolver(appointmentSchema),
        defaultValues: {
            description: '',
        },
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
          rating: 4.5,
          reviewCount: 50,
          services: workshopServices,
          image: PlaceHolderImages.find(p => p.id.startsWith('workshop')) || PlaceHolderImages[1],
        };
    }, [workshopData, workshopServices]);

    const handleLogin = () => {
        initiateAnonymousSignIn(auth);
    };

    async function onSubmit(values: z.infer<typeof appointmentSchema>) {
        if (!user || !firestore || !workshopId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Debes iniciar sesión para agendar una cita.' });
            return;
        }
        setIsSubmitting(true);
        
        const selectedService = workshopServices.find(s => s.id === values.serviceId);
        if (!selectedService) {
            toast({ variant: 'destructive', title: 'Error', description: 'Servicio no válido seleccionado.' });
            setIsSubmitting(false);
            return;
        }

        try {
            const appointmentsCollection = collection(firestore, 'users', user.uid, 'appointments');
            const appointmentData: Omit<Appointment, 'id'> = {
                appointmentDateTime: values.appointmentDateTime.toISOString(),
                workshopId: workshopId,
                userId: user.uid,
                serviceId: values.serviceId,
                serviceName: selectedService.name,
                status: 'scheduled',
                description: values.description || "Cita para " + selectedService.name,
            };
            
            addDocumentNonBlocking(appointmentsCollection, appointmentData);

            toast({
                title: '¡Cita Agendada!',
                description: `Tu cita para ${selectedService.name} en ${workshop?.name} ha sido programada.`,
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

    if (isWorkshopLoading || isUserLoading || isServicesLoading) {
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
            </div>
            
            {/* Appointment Form */}
            <div className="lg:col-span-1">
                <Card className="sticky top-24 shadow-xl">
                    <CardHeader>
                        <CardTitle>Agendar una Cita</CardTitle>
                        <CardDescription>Selecciona un servicio, fecha y describe tu problema.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {user ? (
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="serviceId"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Servicio</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona un servicio" />
                                            </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                            {workshopServices.map(service => (
                                                <SelectItem key={service.id} value={service.id}>
                                                    {service.name} - ${service.price}
                                                </SelectItem>
                                            ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                 <FormField
                                    control={form.control}
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
                                                    format(field.value, "PPP")
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
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Notas Adicionales (Opcional)</FormLabel>
                                        <FormControl>
                                        <Textarea placeholder="Ej: El ruido es más fuerte al girar a la derecha." {...field} />
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
