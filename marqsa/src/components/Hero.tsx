import Link from "next/link";

export default function Hero() {
  return (
    <section id="inicio" className="hero">
      <div className="hero-overlay" />

      <div className="hero-glow hero-glow-one" />
      <div className="hero-glow hero-glow-two" />

      <div className="hero-content">
        <p className="hero-eyebrow">Constructora y urbanizadora</p>

        <h1>
          Construimos
          <span>el futuro</span>
        </h1>

        <p className="hero-description">
          Desarrollamos proyectos de construcción, urbanización e
          infraestructura con calidad, responsabilidad y soluciones diseñadas
          para cada desafío.
        </p>

        <div className="hero-buttons">
          <Link href="#servicios" className="primary-button">
            Conocer servicios
          </Link>

          <Link href="/mrs" className="secondary-button">
            Alquiler de maquinaria
          </Link>
        </div>

        <div className="hero-statistics">
          <div>
            <strong>Calidad</strong>
            <span>En cada proyecto</span>
          </div>

          <div>
            <strong>Experiencia</strong>
            <span>Soluciones profesionales</span>
          </div>

          <div>
            <strong>Compromiso</strong>
            <span>Resultados confiables</span>
          </div>
        </div>
      </div>

      <a href="#nosotros" className="scroll-indicator" aria-label="Continuar">
        <span />
      </a>
    </section>
  );
}