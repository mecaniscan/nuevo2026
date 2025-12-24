'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Download } from 'lucide-react';
import Link from 'next/link';

function CertificateDisplay() {
  const searchParams = useSearchParams();
  const imageData = searchParams.get('image');

  if (!imageData) {
    return (
      <Card className="w-full max-w-4xl text-center">
        <CardHeader>
          <CardTitle>Error</CardTitle>
          <CardDescription>No se ha proporcionado una imagen de certificado válida.</CardDescription>
        </CardHeader>
        <CardContent>
            <Button asChild variant="outline"><Link href="/">Volver al Inicio</Link></Button>
        </CardContent>
      </Card>
    );
  }

  const decodedImage = decodeURIComponent(imageData);

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Vista Previa del Certificado</CardTitle>
        <CardDescription>Este es el certificado de venta generado. Puedes descargarlo como imagen.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <div className="w-full border rounded-lg overflow-hidden">
            <Image src={decodedImage} alt="Certificado de Venta" width={800} height={1120} style={{width: '100%', height: 'auto'}} />
        </div>
        <a href={decodedImage} download="certificado-de-venta.png">
            <Button>
                <Download className="mr-2 h-4 w-4" />
                Descargar Imagen
            </Button>
        </a>
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
