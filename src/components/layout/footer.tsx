'use client';

import { Wrench } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

const WhatsappIcon = () => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 fill-current"><title>WhatsApp</title><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 2.52 5.079 3.556.718.255 1.299.408 1.74.527.534.142 1.028.12 1.425.074.446-.05 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 5.451 0 9.885 4.434 9.889 9.884.002 5.45-4.433 9.884-9.889 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892.157 14.66.965 17.165 2.63 19.05l-2.63 9.95 10.193-2.685a11.815 11.815 0 005.655 1.5l.004-.001h.004c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
);


export function Footer() {
    const whatsappNumber = "+573181591962";
    const whatsappUrl = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}`;
    const [currentYear, setCurrentYear] = useState<number | null>(null);

    useEffect(() => {
        setCurrentYear(new Date().getFullYear());
    }, []);


    return (
        <footer className="border-t py-6 md:px-8 md:py-8 bg-card/50">
            <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
                <div className="flex items-center space-x-2">
                    <Wrench className="h-6 w-6 text-primary" />
                    <div className="flex flex-col items-center md:items-start">
                         <p className="text-sm font-semibold text-foreground">
                           Creador de la APP MecaniScan ANTONIO RUIZ, Venezolano
                        </p>
                        <p className="text-xs text-muted-foreground">
                            &copy; {currentYear || '...'} MecaniScan. Todos los derechos reservados.
                        </p>
                    </div>
                </div>
                <div className="text-center md:text-right">
                     <p className="text-sm text-muted-foreground">Para asistencia técnica:</p>
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline flex items-center justify-center md:justify-end gap-2">
                        <WhatsappIcon />
                        <span>+57 318 1591962</span>
                    </a>
                </div>
            </div>
        </footer>
    );
}
