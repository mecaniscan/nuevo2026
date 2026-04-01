'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Loader2, Lock } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/firebase';
import { initiateEmailSignIn } from '@/firebase/non-blocking-login';
import { getPlaceholderImage } from '@/lib/placeholder-images';
import Image from 'next/image';

const loginSchema = z.object({
  email: z.string().email('El correo electrónico no es válido.'),
  password: z.string().min(1, 'La contraseña es obligatoria.'),
});

export default function LoginPage() {
  const auth = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const loginImage = getPlaceholderImage('login-background');

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  function onLoginSubmit(values: z.infer<typeof loginSchema>) {
    if (!auth) {
        toast({
          variant: 'destructive',
          title: 'Error de Configuración',
          description: 'El servicio de autenticación no está disponible.',
        });
        return;
    }
    setIsLoggingIn(true);
    
    initiateEmailSignIn(auth, values.email, values.password)
        .then(() => {
            router.push('/dashboard');
        })
        .catch ((error: any) => {
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
                toast({
                variant: 'destructive',
                title: 'Error de Inicio de Sesión',
                description: 'El correo electrónico o la contraseña son incorrectos.',
                });
            } else {
                toast({
                variant: 'destructive',
                title: 'Error Inesperado',
                description: 'Ocurrió un error al intentar iniciar sesión. Por favor, intenta de nuevo.',
                });
            }
        })
        .finally(() => {
            setIsLoggingIn(false);
        });
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-background">
       {loginImage && (
            <Image
                src={loginImage.imageUrl}
                alt={loginImage.description}
                fill
                className="absolute inset-0 z-0 object-cover"
                priority
                data-ai-hint={loginImage.imageHint}
            />
       )}
       <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-sm" />
      <Card className="z-20 w-full max-w-md shadow-2xl bg-black/20 border-white/20 text-white">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-headline text-primary">MecaniScan Pro</CardTitle>
          <CardDescription className="text-white/80">Inicia sesión para gestionar tus diagnósticos.</CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onLoginSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo Electrónico</FormLabel>
                      <FormControl>
                        <Input 
                            type="email" 
                            placeholder="tu@correo.com" 
                            {...field}
                            value={field.value ?? ''}
                            className="bg-white/10 border-white/30 focus:bg-white/20 focus:ring-primary text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña</FormLabel>
                      <FormControl>
                        <Input 
                            type="password" 
                            placeholder="••••••••" 
                            {...field} 
                            value={field.value ?? ''}
                            className="bg-white/10 border-white/30 focus:bg-white/20 focus:ring-primary text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12" disabled={isLoggingIn}>
                   {isLoggingIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                   {isLoggingIn ? 'Iniciando Sesión...' : 'Iniciar Sesión'}
                </Button>
              </form>
            </Form>
        </CardContent>
        <CardContent className="flex flex-col gap-4 text-center">
            <p className="text-sm text-white/70">
            ¿No tienes una cuenta?{' '}
            <Button variant="link" className="p-0 h-auto text-primary font-bold" asChild>
                <Link href="/register">Regístrate aquí</Link>
            </Button>
            </p>
            <Button variant="link" className="text-muted-foreground hover:text-white" asChild>
                <Link href="/">Volver a la página principal</Link>
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
