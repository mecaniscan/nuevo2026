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
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
    // Cleanup function: runs when component unmounts or stream changes to null
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);
  
  const handleScan = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    setResult(null);
    setError(null);
    let localStream = stream;

    // 1. Activate Camera if not already active
    if (!localStream) {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        setStream(localStream);
      } catch (err) {
        console.error('Error accessing camera:', err);
        setError('Acceso a la Cámara Denegado. Por favor, habilita los permisos en tu navegador para usar esta función.');
        setIsLoading(false);
        return;
      }
    }

    // Wait for the video element to be ready
    const video = videoRef.current;
    if (!video) {
        setIsLoading(false);
        return;
    }

    // Ensure the stream from state is attached to the video element
    if (video.srcObject !== localStream) {
        video.srcObject = localStream;
    }
    
    try {
        // Wait for video to have enough data to play
        await new Promise<void>((resolve, reject) => {
             const timeout = setTimeout(() => reject(new Error('La cámara tardó demasiado en responder.')), 5000);
             video.oncanplay = () => {
                clearTimeout(timeout);
                video.play().then(resolve).catch(reject);
             };
        });
        
        // 2. Capture the image from the video stream
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        if (canvas.width === 0 || canvas.height === 0) {
            throw new Error("No se pudo obtener el tamaño del video. Asegúrate de que la cámara funcione y los permisos estén activos.");
        }
        
        const context = canvas.getContext('2d');
        context?.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUri = canvas.toDataURL('image/jpeg');

        if (dataUri === 'data:,') {
           throw new Error("La imagen capturada estaba vacía. Intenta de nuevo.");
        }
        
        // 3. Analyze the image via server action
        const output = await scanDashboardAction({ photoDataUri: dataUri });
        setResult(output);
      
        if (output.indicators.length === 0) {
            toast({
              title: "¡Todo en orden!",
              description: "No se encontraron testigos de advertencia en el tablero."
            });
        }

    } catch (e: any) {
        console.error("Scanning Error:", e);
        setError(e.message || "Ocurrió un error inesperado durante el escaneo. Por favor, intenta de nuevo.");
        toast({
            variant: "destructive",
            title: "Error de Escaneo",
            description: e.message || "No se pudo analizar la imagen.",
        });
    } finally {
        setIsLoading(false);
    }
  };

  const stopCamera = () => {
    setStream(null); // This will trigger the cleanup effect
    setResult(null);
    setError(null);
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
                          className={cn("w-full h-full object-cover", { 'hidden': !stream })} 
                          autoPlay 
                          muted 
                          playsInline 
                        />
                         {!stream && <Camera className="w-12 h-12 text-muted-foreground" />}
                         {error && !stream && (
                           <div className="absolute inset-0 flex items-center justify-center bg-black/50 p-4">
                                <Alert variant="destructive">
                                    <AlertTitle>Error de Cámara</AlertTitle>
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                           </div>
                         )}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Button onClick={handleScan} disabled={isLoading} className="w-full">
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                            {stream ? "Escanear de Nuevo" : "Escanear Tablero con IA"}
                        </Button>
                        {stream && (
                             <Button onClick={stopCamera} variant="outline" className="w-full sm:w-auto">
                                <VideoOff className="mr-2 h-4 w-4" />
                                Detener
                            </Button>
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
