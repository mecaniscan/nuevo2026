"use client";

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { scanDashboardAction } from '@/lib/actions';
import type { DashboardScanOutput } from '@/ai/schemas';
import { Loader2, Camera, VideoOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { cn } from '@/lib/utils';

export function OBDII_Decoder() {
  const [result, setResult] = useState<DashboardScanOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    // Cleanup camera on component unmount
    return () => {
      stopCamera();
    };
  }, []);

  const activateCamera = async () => {
    if (!videoRef.current) return;
    setIsLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setIsCameraActive(true);
      setHasPermission(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        variant: 'destructive',
        title: 'Acceso a la Cámara Denegado',
        description: 'Por favor, habilita los permisos de la cámara en la configuración de tu navegador.',
      });
      setHasPermission(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScan = async () => {
    if (!videoRef.current || !isCameraActive) {
      toast({ variant: "destructive", title: "Cámara no activa", description: "Por favor, activa la cámara primero." });
      return;
    }
    
    setIsLoading(true);
    setResult(null);

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const context = canvas.getContext('2d');
    
    if (!context || canvas.width === 0 || canvas.height === 0) {
      toast({ variant: "destructive", title: "Error de Captura", description: "No se pudo procesar la imagen de la cámara. Intenta de nuevo." });
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
          description: "La cámara se desactivará en 5 segundos."
        });
        setTimeout(() => {
          stopCamera();
        }, 5000);
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
                        <video 
                          ref={videoRef} 
                          className={cn("w-full h-full object-cover", { 'hidden': !isCameraActive })} 
                          autoPlay 
                          muted 
                          playsInline 
                        />
                         {!isCameraActive && <Camera className="w-12 h-12 text-muted-foreground" />}
                         {hasPermission === false && (
                           <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                <Alert variant="destructive" className="w-4/5">
                                    <AlertTitle>Cámara denegada</AlertTitle>
                                    <AlertDescription>Habilita los permisos en tu navegador.</AlertDescription>
                                </Alert>
                           </div>
                         )}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                        {!isCameraActive ? (
                            <Button onClick={activateCamera} disabled={isLoading} className="w-full">
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                                Activar Cámara
                            </Button>
                        ) : (
                            <>
                                <Button onClick={handleScan} disabled={isLoading} className="w-full">
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                                    Escanear Tablero
                                </Button>
                                <Button onClick={stopCamera} variant="outline" className="w-full sm:w-auto">
                                    <VideoOff className="mr-2 h-4 w-4" />
                                    Detener
                                </Button>
                            </>
                        )}
                    </div>
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
