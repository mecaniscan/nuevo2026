'use client';
import React, { useState } from 'react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, FileCheck, ShieldAlert, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function VerifyCertificatePublicPage() {
  const [certId, setCertId] = useState('');
  const router = useRouter();

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (certId.trim()) {
      router.push(`/validate-certificate/${certId.trim()}`);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-2xl space-y-8">
            <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-full border-2 border-primary/20 mb-4">
                    <FileCheck className="h-12 w-12 text-primary" />
                </div>
                <h1 className="text-4xl font-bold font-headline text-primary tracking-tight">Validación de Certificados</h1>
                <p className="text-muted-foreground text-lg max-w-lg mx-auto">
                    Ingrese el código único del certificado para verificar la autenticidad y los datos técnicos de un vehículo registrado.
                </p>
            </div>

            <Card className="shadow-2xl border-primary/20">
                <CardHeader>
                    <CardTitle className="text-center">Portal de Verificación</CardTitle>
                    <CardDescription className="text-center">Este proceso es gratuito y ayuda a prevenir estafas en ventas privadas.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleVerify} className="space-y-6">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input 
                                placeholder="Ej: 00a87b58-0b80-44d5-83cd-..." 
                                value={certId}
                                onChange={(e) => setCertId(e.target.value)}
                                className="pl-12 h-14 text-lg font-mono bg-muted/50 border-primary/10 focus:border-primary"
                            />
                        </div>
                        <Button type="submit" className="w-full h-14 text-lg font-bold" disabled={!certId.trim()}>
                            Verificar Registro <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    </form>
                </CardContent>
                <CardContent className="bg-muted/30 p-6 flex items-start gap-4 rounded-b-lg">
                    <ShieldAlert className="h-6 w-6 text-amber-500 shrink-0" />
                    <div className="space-y-1">
                        <p className="text-xs font-bold text-foreground">Importante</p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                            MecaniScan valida que los datos del vehículo coincidan con los registros cargados por el dueño. Siempre recomendamos realizar una inspección física y legal antes de concretar una compra.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
                {[
                    { title: "Seguridad", desc: "Evita falsificaciones de documentos." },
                    { title: "Transparencia", desc: "Acceso real a datos del vehículo." },
                    { title: "Confianza", desc: "Respaldo digital de MecaniScan." }
                ].map((item, i) => (
                    <div key={i} className="text-center space-y-2 p-4 rounded-xl bg-card border">
                        <h4 className="font-bold text-primary">{item.title}</h4>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                ))}
            </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
