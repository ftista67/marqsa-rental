"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const navigation = [
  { name: "Inicio", href: "#inicio" },
  { name: "Nosotros", href: "#nosotros" },
  { name: "Servicios", href: "#servicios" },
  { name: "Proyectos", href: "#proyectos" },
  { name: "Contacto", href: "#contacto" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="navbar">
      <nav className="navbar-container">
      <Link
  href="#inicio"
  className="marqsa-header-logo-link"
  onClick={closeMenu}
  aria-label="Ir al inicio de MARQSA"
>
  <Image
    src="/images/marqsa-logo-recortado.png"
    alt="MARQSA Constructora y Urbanizadora"
    width={587}
    height={463}
    priority
    className="marqsa-header-logo-image"
  />
</Link>

        <div className="navbar-links">
          {navigation.map((item) => (
            <Link key={item.name} href={item.href}>
              {item.name}
            </Link>
          ))}

          <Link href="/mrs" className="navbar-rental-button">
            Alquiler de maquinaria
          </Link>
        </div>

        <button
          type="button"
          className={`mobile-menu ${menuOpen ? "mobile-menu-open" : ""}`}
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen((current) => !current)}
        >
          <span />
          <span />
          <span />
        </button>
      </nav>

      <div
        id="mobile-navigation"
        className={`mobile-navigation ${menuOpen ? "mobile-navigation-open" : ""}`}
      >
        <nav>
          {navigation.map((item) => (
            <Link key={item.name} href={item.href} onClick={closeMenu}>
              {item.name}
            </Link>
          ))}

          <Link
            href="/mrs"
            className="mobile-rental-button"
            onClick={closeMenu}
          >
            Alquiler de maquinaria
          </Link>
        </nav>
      </div>
    </header>
  );
}