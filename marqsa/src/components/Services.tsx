const services = [
  {
    number: "01",
    title: "Construcción",
    description:
      "Ejecución de proyectos residenciales, comerciales e industriales.",
  },
  {
    number: "02",
    title: "Urbanización",
    description:
      "Desarrollo de urbanizaciones, lotificaciones y obras complementarias.",
  },
  {
    number: "03",
    title: "Infraestructura",
    description:
      "Obras viales, drenajes, pavimentación y proyectos de gran escala.",
  },
  {
    number: "04",
    title: "Obra civil",
    description:
      "Soluciones estructurales, movimientos de tierra y trabajos especializados.",
  },
  {
    number: "05",
    title: "Alquiler de maquinaria",
    description:
      "Equipos para construcción disponibles mediante MARQSA Rental System.",
  },
];

export default function Services() {
  return (
    <section id="servicios" className="services-section">
      <div className="section-container">
        <div className="section-heading">
          <div>
            <p className="section-label">Nuestros servicios</p>
            <h2>Soluciones para proyectos de cualquier escala.</h2>
          </div>

          <p>
            Integramos experiencia, maquinaria y capacidad técnica para
            acompañar cada proyecto desde la planificación hasta la ejecución.
          </p>
        </div>

        <div className="services-grid">
          {services.map((service) => (
            <article className="service-card" key={service.number}>
              <span className="service-number">{service.number}</span>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}