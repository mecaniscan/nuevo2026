'use client';
import { Wrench, LogOut } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useUser } from '@/firebase/provider';
import { initiateAnonymousSignIn, initiateSignOut } from '@/firebase/non-blocking-login';
import { useAuth } from '@/firebase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export function Header() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();

  const handleLogin = () => {
    initiateAnonymousSignIn(auth);
  };

  const handleLogout = () => {
    initiateSignOut(auth);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Wrench className="h-6 w-6 text-primary" />
            <span className="font-bold sm:inline-block">
              MecaniScan
            </span>
          </Link>
          <nav className="hidden items-center space-x-6 text-sm font-medium md:flex">
            <Link href="/#workshops" className="transition-colors hover:text-primary">
              Encontrar un Taller
            </Link>
             <Link href="/marketplace" className="transition-colors hover:text-primary">
              Marketplace
            </Link>
            <Link href="/#decoder" className="transition-colors hover:text-primary">
              Decodificador OBD-II
            </Link>
            <Link href="/dashboard" className="transition-colors hover:text-primary">
              Mi Cuenta
            </Link>
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          {!user && !isUserLoading && (
            <>
               <Button variant="ghost" asChild>
                <Link href="/dashboard">Iniciar Sesión</Link>
              </Button>
            </>
          )}
          {user && (
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>Mi Cuenta</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                     <Link href="/dashboard">Panel de Control</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}