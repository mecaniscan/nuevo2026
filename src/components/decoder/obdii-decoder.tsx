"use client";

import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { decodeObdiiErrorAction, decodeObdiiErrorFromImageAction } from '@/lib/actions';
import type { ObdiiErrorDecoderOutput } from '@/ai/schemas';
import { Loader2, ScanLine, Camera, Video, VideoOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const FormSchema = z.object({
  errorCode: z.string().min(4, { message: 'El código de error debe tener al menos 4 caracteres.' }).regex(/^[A-Z0-9]+$/, { message: 'Caracteres inválidos en el código de error.' }),
});

export function OBDII_Decoder() {
  const [result, setResult] = useState<ObdiiErrorDecoderOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);


  useEffect(() => {
    const getCameraPermission = async () => {
      if (!isCameraOpen) {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        streamRef.current = stream;
        setHasCameraPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error al acceder a la cámara:', error);
        setHasCameraPermission(false);
        setIsCameraOpen(false);
        toast({
          variant: 'destructive',
          title: 'Acceso a la cámara denegado',
          description: 'Por favor, habilita los permisos de la cámara en tu navegador para usar esta función.',
        });
      }
    };

    getCameraPermission();

    return () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
    }
  }, [isCameraOpen, toast]);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: { errorCode: "" },
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setIsLoading(true);
    setResult(null);
    
    try {
      const output = await decodeObdiiErrorAction({ errorCode: data.errorCode.toUpperCase() });
      setResult(output);
      form.reset();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo decodificar el código de error. Por favor, verifica el código e intenta de nuevo.",
      });
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleScanWithCamera() {
    if (!videoRef.current) return;

    setIsLoading(true);
    setResult(null);

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const context = canvas.getContext('2d');
    if(context){
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const imageDataUri = canvas.toDataURL('image/jpeg');

        try {
            const output = await decodeObdiiErrorFromImageAction({ imageDataUri });
            setResult(output);
            setIsCameraOpen(false); // Close camera on success
        } catch(e) {
            toast({
                variant: "destructive",
                title: "Error de Escaneo",
                description: "No se pudo encontrar un código en la imagen. Intenta de nuevo con mejor iluminación.",
            });
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }
  }

  return (
    <section id="decoder" className="w-full py-12 md:py-24 lg:py-32">
      <div className="container px-4 md:px-6">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-4">
            <div className="inline-block rounded-lg bg-secondary px-3 py-1 text-sm">Diagnóstico con IA</div>
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl font-headline text-primary">Decodifica los Problemas de tu Auto</h2>
            <p className="max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Ingresa el código de error de tu escáner OBD-II o usa tu cámara para escanearlo directamente. Obtén un análisis instantáneo del problema, las posibles causas y las soluciones comunes.
            </p>
          </div>
          <div className="flex items-center justify-center">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader>
                  <CardTitle>Decodificador de Códigos de Error OBD-II</CardTitle>
                  <CardDescription>Ingresa tu código (ej. P0171) o escanea con tu cámara.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isCameraOpen ? (
                        <div className="space-y-4">
                             <div className="relative w-full aspect-video bg-muted rounded-md overflow-hidden border">
                                <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                                <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-white" onClick={() => setIsCameraOpen(false)}>
                                    <VideoOff />
                                </Button>
                             </div>
                             {hasCameraPermission === false && (
                                <Alert variant="destructive">
                                          <AlertTitle>Acceso a la cámara requerido</AlertTitle>
                                          <AlertDescription>
                                            Por favor permite el acceso a la cámara para usar esta función.
                                          </AlertDescription>
                                  </Alert>
                            )}
                             <Button onClick={handleScanWithCamera} disabled={isLoading || hasCameraPermission === false} className="w-full">
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                                Escanear Código
                            </Button>
                        </div>
                    ) : (
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                control={form.control}
                                name="errorCode"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Código de Error</FormLabel>
                                    <FormControl>
                                        <Input placeholder="P0171" {...field} className="uppercase" />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                                <Button type="submit" disabled={isLoading} className="w-full">
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanLine className="mr-2 h-4 w-4" />}
                                    Decodificar Manualmente
                                </Button>
                            </form>
                        </Form>
                    )}
                </CardContent>
                <CardFooter className="flex-col items-stretch">
                   {!isCameraOpen && (
                        <>
                            <div className="relative flex justify-center my-4">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <span className="relative bg-card px-2 text-xs uppercase text-muted-foreground">O</span>
                            </div>
                            <Button variant="outline" onClick={() => setIsCameraOpen(true)} disabled={isLoading}>
                                <Video className="mr-2 h-4 w-4"/>
                                Escanear con Cámara
                            </Button>
                        </>
                    )}
                    {result && (
                        <div className="w-full animate-in fade-in-50 duration-500 pt-6">
                            <h3 className="text-lg font-semibold">Resultados para {result.code}</h3>
                            <Accordion type="single" collapsible className="w-full mt-2" defaultValue="description">
                                <AccordionItem value="description">
                                <AccordionTrigger>Descripción</AccordionTrigger>
                                <AccordionContent>{result.description}</AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="causes">
                                <AccordionTrigger>Causas Potenciales</AccordionTrigger>
                                <AccordionContent className="whitespace-pre-line">{result.potentialCauses}</AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="solutions">
                                <AccordionTrigger>Soluciones Comunes</AccordionTrigger>
                                <AccordionContent className="whitespace-pre-line">{result.commonSolutions}</AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </div>
                    )}
                </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
