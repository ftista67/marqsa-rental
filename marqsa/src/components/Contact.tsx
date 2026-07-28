"use client";

import { FormEvent, useState } from "react";

export default function Contact() {
  const [sending, setSending] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);

    const formData = new FormData(event.currentTarget);

    const name = String(formData.get("name") || "").trim();
    const company = String(formData.get("company") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const projectType = String(
      formData.get("projectType") || "",
    ).trim();
    const message = String(formData.get("message") || "").trim();

    const subject = encodeURIComponent(
      `Solicitud de información — ${projectType}`,
    );

    const body = encodeURIComponent(
      [
        "SOLICITUD DE CONTACTO",
        "",
        `Nombre: ${name}`,
        `Empresa: ${company || "No indicada"}`,
        `Teléfono: ${phone}`,
        `Correo: ${email}`,
        `Tipo de proyecto: ${projectType}`,
        "",
        "Mensaje:",
        message,
      ].join("\n"),
    );

    window.location.href =
      `mailto:ventas@marqsa.com?subject=${subject}&body=${body}`;

    window.setTimeout(() => {
      setSending(false);
    }, 1000);
  }

  return (
    <section id="contacto" className="contact-section">
      <div className="section-container contact-grid">
        <div className="contact-content">
          <p className="section-label">Contacto</p>

          <h2>
            Hablemos sobre
            <span> su próximo proyecto.</span>
          </h2>

          <p className="contact-description">
            Cuéntenos qué necesita y un asesor de MARQSA se
            pondrá en contacto para brindarle atención
            personalizada.
          </p>

          <div className="contact-info">
            <article>
              <span>Sede central</span>

              <strong>
                Km 8.5 Ruta al Atlántico
              </strong>
            </article>

            <article>
              <span>Teléfonos</span>

              <div className="contact-value-links">
                <a href="tel:+50250503887">
                  5050-3887
                </a>

                <a href="tel:+50222190103">
                  2219-0103
                </a>
              </div>
            </article>

            <article>
              <span>Correo electrónico</span>

              <a href="mailto:ventas@marqsa.com">
                ventas@marqsa.com
              </a>
            </article>

            <article>
              <span>Redes sociales</span>

              <strong>
                Marqsa Constructora y Urbanizadora
              </strong>
            </article>
          </div>

          <div className="contact-direct-actions">
            <a
              href="tel:+50250503887"
              className="primary-button"
            >
              Llamar ahora
            </a>

            <a
              href="mailto:ventas@marqsa.com"
              className="secondary-button"
            >
              Enviar correo
            </a>
          </div>
        </div>

        <form
          className="contact-form"
          onSubmit={handleSubmit}
        >
          <div className="contact-form-heading">
            <p className="section-label">
              Solicitud de información
            </p>

            <h3>Cuéntenos sobre su proyecto</h3>
          </div>

          <div className="form-row">
            <label>
              Nombre completo

              <input
                type="text"
                name="name"
                placeholder="Nombre y apellido"
                autoComplete="name"
                required
              />
            </label>

            <label>
              Empresa

              <input
                type="text"
                name="company"
                placeholder="Nombre de la empresa"
                autoComplete="organization"
              />
            </label>
          </div>

          <div className="form-row">
            <label>
              Teléfono

              <input
                type="tel"
                name="phone"
                placeholder="+502"
                autoComplete="tel"
                required
              />
            </label>

            <label>
              Correo electrónico

              <input
                type="email"
                name="email"
                placeholder="correo@empresa.com"
                autoComplete="email"
                required
              />
            </label>
          </div>

          <label>
            Tipo de proyecto

            <select
              name="projectType"
              defaultValue=""
              required
            >
              <option value="" disabled>
                Seleccione una opción
              </option>

              <option value="Construcción">
                Construcción
              </option>

              <option value="Urbanización">
                Urbanización
              </option>

              <option value="Infraestructura">
                Infraestructura
              </option>

              <option value="Obra civil">
                Obra civil
              </option>

              <option value="Alquiler de maquinaria">
                Alquiler de maquinaria
              </option>
            </select>
          </label>

          <label>
            Mensaje

            <textarea
              name="message"
              rows={6}
              placeholder="Ubicación, alcance y necesidades principales del proyecto"
              required
            />
          </label>

          <button
            type="submit"
            className="contact-submit"
            disabled={sending}
          >
            {sending
              ? "Preparando correo..."
              : "Enviar solicitud"}
          </button>

          <p className="contact-form-note">
            Al enviar, se abrirá su aplicación de correo con la
            solicitud preparada para ventas@marqsa.com.
          </p>
        </form>
      </div>
    </section>
  );
}