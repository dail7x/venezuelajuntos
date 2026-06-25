import Link from "next/link";
import Image from "next/image";
import { HandHeart, Map, UserRoundX } from "lucide-react";

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
      <nav aria-label="Principal" className="header-actions">
        <Link className="header-button primary" href="/reportar/desaparecido">
          <UserRoundX aria-hidden="true" />
          <span>Reportar persona desaparecida</span>
        </Link>
        <Link className="header-button" href="/mapa">
          <Map aria-hidden="true" />
          <span>Mapa</span>
        </Link>
        <Link className="header-button" href="/ayudar">
          <HandHeart aria-hidden="true" />
          <span>Ayudar</span>
        </Link>
      </nav>
    </header>
  );
}
