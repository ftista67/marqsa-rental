import Link from "next/link";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="section-container footer-grid">

        <div className="footer-brand">
          <h3>MARQSA</h3>

          <p>Constructora y Urbanizadora</p>

          <span>
            Especialistas en construcción, urbanización, movimiento de
            tierras y alquiler de maquinaria pesada para proyectos en
            todo Guatemala.
          </span>
        </div>

        <div>
          <h4>Enlaces rápidos</h4>

          <nav className="footer-links">
            <Link href="#inicio">Inicio</Link>
            <Link href="#nosotros">Nosotros</Link>
            <Link href="#servicios">Servicios</Link>
            <Link href="#proyectos">Proyectos</Link>
            <Link href="#contacto">Contacto</Link>
          </nav>
        </div>

        <div>
          <h4>MARQSA Rental System</h4>

          <nav className="footer-links">
            <Link href="/mrs">Ver maquinaria</Link>
            <Link href="/mrs/cotizar">
              Solicitar cotización
            </Link>
            <Link href="/admin/login">
              Panel administrativo
            </Link>
          </nav>
        </div>

        <div>
          <h4>Contacto</h4>

          <div className="footer-contact">

            <p>
              📍 Km 8.5 Ruta al Atlántico
            </p>

            <p>
              ☎ 5050-3887
            </p>

            <p>
              ☎ 2219-0103
            </p>

            <p>
              ✉ ventas@marqsa.com
            </p>

            <p>
              Facebook:
            </p>

            <strong>
              Marqsa Constructora y Urbanizadora
            </strong>

          </div>
        </div>

      </div>

      <div className="section-container footer-bottom">

        <p>
          © 2026 MARQSA Constructora y Urbanizadora.
          Todos los derechos reservados.
        </p>

        <p>
          MARQSA Rental System | Guatemala
        </p>

      </div>
    </footer>
  );
}