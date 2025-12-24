"use client";

import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { scanDashboardAction } from '@/lib/actions';
import type { DashboardScanOutput } from '@/ai/schemas';
import { Loader2, Camera, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

const FormSchema = z.object({});

export function OBDII_Decoder() {
  const [result, setResult] = useState<DashboardScanOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const getCameraPermission = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast({
          variant: 'destructive',
          title: 'Cámara no Soportada',
          description: 'Tu navegador no soporta el acceso a la cámara.',
        });
        setHasCameraPermission(false);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
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
          description: 'Por favor, activa los permisos de la cámara en tu navegador para usar esta función.',
        });
      }
    };

    getCameraPermission();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [toast]);


  const handleScan = async () => {
    if (!videoRef.current) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se puede acceder al video.",
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUri = canvas.toDataURL('image/jpeg');

      try {
        const output = await scanDashboardAction({ photoDataUri: dataUri });
        setResult(output);
      } catch (e) {
        toast({
          variant: "destructive",
          title: "Error de Análisis",
          description: "No se pudo analizar la imagen. Por favor, asegúrate de que el tablero esté bien iluminado e inténtalo de nuevo.",
        });
        console.error(e);
      }
    }

    setIsLoading(false);
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
                  <CardTitle>Análisis de Tablero con Cámara</CardTitle>
                  <CardDescription>Apunta tu cámara al tablero y presiona "Escanear".</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="w-full aspect-video bg-muted rounded-md overflow-hidden flex items-center justify-center relative">
                        <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                        {hasCameraPermission === false && (
                             <Alert variant="destructive" className="m-4">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Se requiere acceso a la cámara</AlertTitle>
                                <AlertDescription>
                                  Por favor, permite el acceso a la cámara para utilizar esta función.
                                </AlertDescription>
                            </Alert>
                        )}
                         {hasCameraPermission === null && (
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                <Loader2 className="w-8 h-8 animate-spin"/>
                                <span>Iniciando cámara...</span>
                            </div>
                        )}
                    </div>
                     <Button onClick={handleScan} disabled={isLoading || hasCameraPermission === false || hasCameraPermission === null} className="w-full">
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
