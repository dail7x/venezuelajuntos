import Link from "next/link";

export function Header() {
  return (
    <header className="site-header">
      <Link className="brand" href="/">
        <span className="brand-mark">VJ</span>
        <span>venezuelajuntos.online</span>
      </Link>
      <nav aria-label="Principal">
        <Link href="/mapa">Mapa</Link>
        <Link href="/ayudar">Ayudar</Link>
        <Link href="/admin">Admin</Link>
      </nav>
    </header>
  );
}
