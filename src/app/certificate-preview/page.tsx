'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Download, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

function CertificateDisplay() {
  const searchParams = useSearchParams();
  const imageData = searchParams.get('image');

  if (!imageData) {
    return (
      <Card className="w-full max-w-2xl text-center shadow-2xl">
        <CardHeader>
          <CardTitle className="text-destructive">Error de Generación</CardTitle>
          <CardDescription>No se ha proporcionado una imagen de certificado válida para la vista previa.</CardDescription>
        </CardHeader>
        <CardContent>
            <Button asChild variant="outline">
              <Link href="/marketplace"><ArrowLeft className="mr-2 h-4 w-4"/>Volver al Marketplace</Link>
            </Button>
        </CardContent>
      </Card>
    );
  }

  const decodedImage = decodeURIComponent(imageData);

  return (
    <Card className="w-full max-w-2xl shadow-2xl">
      <CardHeader>
        <CardTitle>Vista Previa del Certificado QR</CardTitle>
        <CardDescription>Este es el código QR para el certificado de venta. Escanéalo con tu teléfono o descárgalo como imagen para compartirlo.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-6">
        <div className="w-full max-w-sm border-4 border-primary p-2 rounded-lg overflow-hidden bg-white">
            <Image src={decodedImage} alt="Certificado de Venta en QR" width={500} height={500} style={{width: '100%', height: 'auto'}} />
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
            <a href={decodedImage} download="certificado-qr-venta.png" className="flex-1">
                <Button className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Descargar QR
                </Button>
            </a>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/marketplace"><ArrowLeft className="mr-2 h-4 w-4"/>Volver</Link>
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}


export default function CertificatePreviewPage() {
    return (
        <div className="container mx-auto py-12 flex items-center justify-center min-h-screen bg-muted">
            <Suspense fallback={<Loader2 className="h-16 w-16 animate-spin text-primary" />}>
                <CertificateDisplay />
            </Suspense>
        </div>
    )
}
