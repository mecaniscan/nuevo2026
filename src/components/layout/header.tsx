'use client';
import { Wrench, LogOut, PanelLeft, ShoppingCart, User, Search, Settings, FileCheck } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useUser, useAuth } from '@/firebase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { cn } from '@/lib/utils';
import { signOut } from 'firebase/auth';

function MainNav({ className, onLinkClick }: { className?: string, onLinkClick?: () => void }) {
  return (
    <nav className={cn("items-center space-x-6 lg:space-x-8", className)}>
      <Link href="/#workshops" onClick={onLinkClick} className="text-base font-semibold text-gradient-tech hover:opacity-80 transition-opacity">
        Talleres
      </Link>
       <Link href="/marketplace" onClick={onLinkClick} className="text-base font-semibold text-gradient-tech hover:opacity-80 transition-opacity">
        Marketplace
      </Link>
      <Link href="/verify" onClick={onLinkClick} className="text-base font-semibold text-gradient-tech hover:opacity-80 transition-opacity flex items-center gap-1">
        <FileCheck className="h-4 w-4 text-primary" /> Validar Certificado
      </Link>
    </nav>
  );
}

export function Header() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);


  const handleLogout = () => {
    if (auth) {
      signOut(auth);
    }
  };
  
  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Wrench className="h-6 w-6 text-primary" />
            <span className="font-bold sm:inline-block">
              MecaniScan
            </span>
          </Link>
          <MainNav />
        </div>
        
        {/* Mobile Menu */}
        {isClient && (
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
              >
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Abrir Menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="pr-0">
               <SheetHeader>
                  <SheetTitle className="sr-only">Menú Principal</SheetTitle>
              </SheetHeader>
              <Link href="/" className="mr-6 flex items-center space-x-2 mb-8" onClick={() => setIsSheetOpen(false)}>
                  <Wrench className="h-6 w-6 text-primary" />
                  <span className="font-bold">MecaniScan</span>
              </Link>
              <div className="flex flex-col space-y-4">
                  <MainNav className="flex flex-col items-start space-x-0 space-y-4" onLinkClick={() => setIsSheetOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
        )}
        <div className="flex flex-1 items-center justify-start md:justify-center">
             <div className="md:hidden">
                <Link href="/" className="flex items-center space-x-2">
                    <Wrench className="h-6 w-6 text-primary" />
                    <span className="font-bold">MecaniScan</span>
                </Link>
            </div>
        </div>

        <div className="flex items-center justify-end space-x-2">
          {!user && !isUserLoading && (
            <>
               <Button variant="ghost" asChild>
                <Link href="/login" className="text-base font-semibold text-gradient-tech hover:opacity-80 transition-opacity">Iniciar Sesión</Link>
              </Button>
               <Button asChild className="bg-gradient-tech text-primary-foreground hover:opacity-90 transition-opacity border-none">
                <Link href="/register">Crear Cuenta</Link>
              </Button>
            </>
          )}
          {user && (
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                        <Avatar className="h-9 w-9">
                            <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? "Usuario"} />
                            <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                        </Avatar>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.displayName || "Usuario"}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                     <Link href="/dashboard"><Settings className="mr-2 h-4 w-4" />Panel de Control</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                     <Link href="/dashboard/profile"><User className="mr-2 h-4 w-4" />Mi Perfil</Link>
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