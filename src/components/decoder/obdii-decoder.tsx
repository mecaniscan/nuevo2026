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
  errorCode: z.string().min(4, { message: 'Error code must be at least 4 characters.' }).regex(/^[A-Z0-9]+$/, { message: 'Invalid characters in error code.' }),
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
        description: "Failed to decode error code. Please check the code and try again.",
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
            <div className="inline-block rounded-lg bg-secondary px-3 py-1 text-sm">AI-Powered Diagnostics</div>
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl font-headline text-primary">Decode Your Car's Problems</h2>
            <p className="max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Enter the error code from your OBD-II scanner to get an instant analysis of the issue, potential causes, and common solutions. Take control of your car maintenance.
            </p>
          </div>
          <div className="flex items-center justify-center">
            <Card className="w-full max-w-md shadow-lg">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <CardHeader>
                    <CardTitle>OBD-II Error Code Decoder</CardTitle>
                    <CardDescription>Enter your code (e.g., P0171)</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="errorCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Error Code</FormLabel>
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
                      Decode
                    </Button>
                  </CardFooter>
                </form>
              </Form>
              {result && (
                <CardContent className="animate-in fade-in-50 duration-500">
                  <h3 className="text-lg font-semibold mt-4">Results for {result.code}</h3>
                  <Accordion type="single" collapsible className="w-full mt-2" defaultValue="description">
                    <AccordionItem value="description">
                      <AccordionTrigger>Description</AccordionTrigger>
                      <AccordionContent>{result.description}</AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="causes">
                      <AccordionTrigger>Potential Causes</AccordionTrigger>
                      <AccordionContent className="whitespace-pre-line">{result.potentialCauses}</AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="solutions">
                      <AccordionTrigger>Common Solutions</AccordionTrigger>
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
