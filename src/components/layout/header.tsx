'use client';
import { Wrench } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useUser } from '@/firebase/provider';
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';
import { useAuth } from '@/firebase';

export function Header() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();

  const handleLogin = () => {
    initiateAnonymousSignIn(auth);
  };
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Wrench className="h-6 w-6 text-primary" />
            <span className="font-bold sm:inline-block">
              MechConnect
            </span>
          </Link>
          <nav className="hidden items-center space-x-6 text-sm font-medium md:flex">
            <Link href="/#workshops" className="transition-colors hover:text-primary">
              Encontrar un Taller
            </Link>
            <Link href="/#decoder" className="transition-colors hover:text-primary">
              Decodificador OBD-II
            </Link>
            <Link href="/dashboard" className="transition-colors hover:text-primary">
              Mi Cuenta
            </Link>
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-4">
          {!user && !isUserLoading && (
            <Button variant="outline" className="hidden sm:inline-flex" onClick={handleLogin}>Iniciar Sesión</Button>
          )}
          {user && (
             <Button asChild variant="outline" className="hidden sm:inline-flex">
                <Link href="/dashboard">Mi Cuenta</Link>
             </Button>
          )}
          <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Link href="/dashboard/register-workshop">Registra tu Taller</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
