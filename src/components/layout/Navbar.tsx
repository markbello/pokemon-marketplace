import Link from 'next/link';
import Image from 'next/image';
import UserMenu from '@/components/auth/UserMenu';

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 w-full items-center justify-between px-4">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.png"
            alt="Pokemon Marketplace"
            width={554}
            height={130}
            className="h-10 w-auto"
            priority
            quality={100}
          />
        </Link>
        <UserMenu />
      </div>
    </nav>
  );
}
