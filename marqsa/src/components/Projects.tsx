const projects = [
  {
    category: "Infraestructura",
    title: "Desarrollo vial y movimiento de tierras",
    description:
      "Ejecución de trabajos de preparación, conformación y adecuación de terreno.",
  },
  {
    category: "Urbanización",
    title: "Proyectos residenciales y urbanísticos",
    description:
      "Planificación y desarrollo de espacios funcionales, seguros y duraderos.",
  },
  {
    category: "Obra civil",
    title: "Construcción de soluciones estructurales",
    description:
      "Proyectos ejecutados con control técnico, calidad y cumplimiento.",
  },
];

export default function Projects() {
  return (
    <section id="proyectos" className="projects-section">
      <div className="section-container">
        <div className="section-heading">
          <div>
            <p className="section-label">Proyectos</p>
            <h2>Obras que reflejan nuestra capacidad.</h2>
          </div>

          <p>
            Cada proyecto representa planificación, experiencia y compromiso
            con resultados confiables.
          </p>
        </div>

        <div className="projects-grid">
          {projects.map((project, index) => (
            <article className="project-card" key={project.title}>
              <div className="project-image-placeholder">
                <span>Proyecto {String(index + 1).padStart(2, "0")}</span>
              </div>

              <div className="project-card-content">
                <p>{project.category}</p>
                <h3>{project.title}</h3>
                <span>{project.description}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}