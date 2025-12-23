import { Wrench } from 'lucide-react';
import Link from 'next/link';

export function Footer() {
    return (
        <footer className="border-t py-6 md:px-8 md:py-8">
            <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
                <div className="flex items-center space-x-2">
                    <Wrench className="h-6 w-6 text-primary" />
                    <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
                        Creado por MechConnect. &copy; {new Date().getFullYear()} Todos los derechos reservados.
                    </p>
                </div>
                <div className="flex space-x-4">
                    <Link href="#" className="text-sm text-muted-foreground hover:text-primary">Política de Privacidad</Link>
                    <Link href="#" className="text-sm text-muted-foreground hover:text-primary">Términos de Servicio</Link>
                </div>
            </div>
        </footer>
    );
}
