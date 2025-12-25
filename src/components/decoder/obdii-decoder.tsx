"use client";

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { scanDashboardAction } from '@/lib/actions';
import type { DashboardScanOutput } from '@/ai/schemas';
import { Loader2, Camera, AlertCircle, VideoOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { cn } from '@/lib/utils';

export function OBDII_Decoder() {
  const [result, setResult] = useState<DashboardScanOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

 useEffect(() => {
    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({video: true});
        setHasCameraPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Acceso a la Cámara Denegado',
          description: 'Por favor, habilita los permisos de la cámara en la configuración de tu navegador para usar esta aplicación.',
        });
      }
    };

    getCameraPermission();
  }, [toast]);


  const handleScan = async () => {
    if (isLoading || !hasCameraPermission) return;

    setIsLoading(true);
    setResult(null);

    if (!videoRef.current) {
      toast({ variant: "destructive", title: "Error", description: "No se puede acceder al video." });
      setIsLoading(false);
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo procesar la imagen." });
      setIsLoading(false);
      return;
    }
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUri = canvas.toDataURL('image/jpeg');

    if (dataUri === 'data:,') {
       toast({ variant: "destructive", title: "Error de Captura", description: "No se pudo capturar la imagen. Intenta de nuevo." });
       setIsLoading(false);
       return;
    }
    
    try {
      const output = await scanDashboardAction({ photoDataUri: dataUri });
      setResult(output);
      if (output.indicators.length === 0) {
        toast({
          title: "No se encontraron testigos",
          description: "No se encontraron luces de advertencia en el tablero."
        });
      }
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Error de Análisis",
        description: "No se pudo analizar la imagen. Asegúrate de que el tablero esté bien iluminado.",
      });
      console.error(e);
    } finally {
        setIsLoading(false);
    }
  };


  return (
    <section id="decoder" className="w-full py-12 md:py-24 lg:py-32">
      <div className="container px-4 md:px-6">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-4">
            <div className="inline-block rounded-lg bg-secondary px-3 py-1 text-sm">Diagnóstico con IA</div>
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl font-headline text-primary">Escanea el Tablero de tu Vehículo</h2>
            <p className="max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Usa la cámara de tu dispositivo para escanear el tablero de tu auto. Nuestra IA identificará los testigos de advertencia y te dará un diagnóstico al instante.
            </p>
          </div>
          <div className="flex items-center justify-center">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader>
                  <CardTitle>Scanner de tablero con IA</CardTitle>
                  <CardDescription>
                     Apunta la cámara al tablero de tu vehículo y presiona escanear.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="w-full aspect-video bg-muted rounded-md overflow-hidden flex items-center justify-center relative">
                        <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                         { !hasCameraPermission && (
                             <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white p-4">
                                <AlertCircle className="w-12 h-12 mb-4" />
                                <h3 className="font-bold text-lg">Cámara no disponible</h3>
                                <p className="text-center text-sm">Por favor, concede los permisos de cámara en tu navegador para continuar.</p>
                            </div>
                        )}
                    </div>
                     <Button onClick={handleScan} disabled={isLoading || !hasCameraPermission} className="w-full">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                        Escanear Tablero
                    </Button>
                </CardContent>
                <CardFooter className="flex-col items-stretch">
                    {result && (
                        <div className="w-full animate-in fade-in-50 duration-500 pt-6">
                            <h3 className="text-lg font-semibold">Resultados del Análisis</h3>
                             {result.indicators.length > 0 ? (
                                <Accordion type="single" collapsible className="w-full mt-2" defaultValue={result.indicators[0].name}>
                                    {result.indicators.map((indicator, index) => (
                                        <AccordionItem value={indicator.name} key={index}>
                                            <AccordionTrigger>{indicator.name}</AccordionTrigger>
                                            <AccordionContent className="space-y-4">
                                                <div>
                                                    <h4 className="font-semibold">Descripción</h4>
                                                    <p>{indicator.description}</p>
                                                </div>
                                                 <div>
                                                    <h4 className="font-semibold">Causas Potenciales</h4>
                                                    <p className="whitespace-pre-line">{indicator.potentialCauses}</p>
                                                </div>
                                                 <div>
                                                    <h4 className="font-semibold">Soluciones Comunes</h4>
                                                    <p className="whitespace-pre-line">{indicator.commonSolutions}</p>
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            ) : (
                                <div className="text-center text-muted-foreground p-4 bg-muted rounded-md">
                                    <p>No se detectaron indicadores de advertencia en la imagen.</p>
                                </div>
                            )}
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
