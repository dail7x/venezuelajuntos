import Link from "next/link";
import Image from "next/image";

export function Header() {
  return (
    <header className="site-header">
      <Link className="brand" href="/">
        <Image
          src="/logo-horizontal.svg"
          alt="Venezuela Juntos Logo"
          width={182}
          height={38}
          className="brand-logo"
          priority
        />
      </Link>
      <nav aria-label="Principal">
        <Link href="/mapa">Mapa</Link>
        <Link href="/ayudar">Ayudar</Link>
        <Link href="/admin">Admin</Link>
      </nav>
    </header>
  );
}
