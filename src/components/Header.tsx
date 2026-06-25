import Link from "next/link";
import Image from "next/image";
import { HandHeart, Map, UserRoundX } from "lucide-react";

export function Header() {
  return (
    <header className="site-header">
      <Link className="brand" href="/">
        <Image
          src="/logo.png"
          alt="Venezuela Juntos Logo"
          width={171}
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
          <span>Mapa de reportes</span>
        </Link>
        <Link className="header-button" href="/lista-aparecidos">
          <HandHeart aria-hidden="true" />
          <span>Listas de Hospitales</span>
        </Link>
        <Link className="header-button" href="/ayudar">
          <HandHeart aria-hidden="true" />
          <span>Ofrecer ayuda</span>
        </Link>
      </nav>
    </header>
  );
}
