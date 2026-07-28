export default function About() {
  return (
    <section id="nosotros" className="about-section">
      <div className="section-container about-grid">
        <div>
          <p className="section-label">Quiénes somos</p>

          <h2>
            Construimos con visión,
            <span> experiencia y compromiso.</span>
          </h2>
        </div>

        <div className="about-copy">
          <p>
            MARQSA es una constructora y urbanizadora enfocada en el desarrollo
            de proyectos de infraestructura, obra civil y urbanización.
          </p>

          <p>
            Trabajamos con estándares de calidad, planificación y responsabilidad
            para brindar soluciones confiables en cada etapa del proyecto.
          </p>

          <div className="about-values">
            <div>
              <strong>Calidad</strong>
              <span>Procesos bien ejecutados</span>
            </div>

            <div>
              <strong>Responsabilidad</strong>
              <span>Cumplimiento y confianza</span>
            </div>

            <div>
              <strong>Innovación</strong>
              <span>Soluciones para cada desafío</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}