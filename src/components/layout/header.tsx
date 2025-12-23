import { Wrench } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function Header() {
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
            <Link href="#workshops" className="transition-colors hover:text-primary">
              Find a Workshop
            </Link>
            <Link href="#decoder" className="transition-colors hover:text-primary">
              OBD-II Decoder
            </Link>
            <Link href="#" className="transition-colors hover:text-primary">
              Account
            </Link>
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <Button variant="outline" className="hidden sm:inline-flex">Sign In</Button>
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90">Register Your Workshop</Button>
        </div>
      </div>
    </header>
  );
}
