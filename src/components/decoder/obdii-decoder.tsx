"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { decodeObdiiErrorAction } from '@/lib/actions';
import type { ObdiiErrorDecoderOutput } from '@/ai/flows/obdii-error-decoder';
import { Loader2, ScanLine } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const FormSchema = z.object({
  errorCode: z.string().min(4, { message: 'El código de error debe tener al menos 4 caracteres.' }).regex(/^[A-Z0-9]+$/, { message: 'Caracteres inválidos en el código de error.' }),
});

export function OBDII_Decoder() {
  const [result, setResult] = useState<ObdiiErrorDecoderOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

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

  return (
    <section id="decoder" className="w-full py-12 md:py-24 lg:py-32">
      <div className="container px-4 md:px-6">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-4">
            <div className="inline-block rounded-lg bg-secondary px-3 py-1 text-sm">Diagnóstico con IA</div>
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl font-headline text-primary">Decodifica los Problemas de tu Auto</h2>
            <p className="max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Ingresa el código de error de tu escáner OBD-II para obtener un análisis instantáneo del problema, las posibles causas y las soluciones comunes. Toma el control del mantenimiento de tu auto.
            </p>
          </div>
          <div className="flex items-center justify-center">
            <Card className="w-full max-w-md shadow-lg">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <CardHeader>
                    <CardTitle>Decodificador de Códigos de Error OBD-II</CardTitle>
                    <CardDescription>Ingresa tu código (ej. P0171)</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
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
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" disabled={isLoading} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanLine className="mr-2 h-4 w-4" />}
                      Decodificar
                    </Button>
                  </CardFooter>
                </form>
              </Form>
              {result && (
                <CardContent className="animate-in fade-in-50 duration-500">
                  <h3 className="text-lg font-semibold mt-4">Resultados para {result.code}</h3>
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
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
