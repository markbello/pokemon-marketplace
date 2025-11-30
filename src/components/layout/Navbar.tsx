import Link from 'next/link';
import Image from 'next/image';
import UserMenu from '@/components/auth/UserMenu';

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-20 w-full items-center justify-between px-4">
        <Link href="/" className="flex items-center">
          <Image
            src="/kado-logo.jpg"
            alt="kado.io"
            width={200}
            height={60}
            className="h-14 w-auto"
            priority
          />
        </Link>
        <UserMenu />
      </div>
    </nav>
  );
}
