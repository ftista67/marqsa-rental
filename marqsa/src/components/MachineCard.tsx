import Link from "next/link";

type MachineStatus =
  | "Disponible"
  | "Alquilada"
  | "Mantenimiento"
  | "Reservada";

type MachineCardProps = {
  id: string;
  name: string;
  category: string;
  brand: string;
  model: string;
  pricePerDay: number;
  status: MachineStatus;
  image?: string;
};

export default function MachineCard({
  id,
  name,
  category,
  brand,
  model,
  pricePerDay,
  status,
  image,
}: MachineCardProps) {
  const statusClass = status
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll(" ", "-");

  return (
    <article className="machine-card">
      <div
        className="machine-image"
        style={
          image
            ? {
                backgroundImage: `
                  linear-gradient(to top, rgba(0, 0, 0, 0.78), transparent),
                  url("${image}")
                `,
              }
            : undefined
        }
      >
        <span className={`machine-status machine-status-${statusClass}`}>
          {status}
        </span>

        {!image && (
          <div className="machine-image-placeholder">
            <span>Sin fotografía</span>
          </div>
        )}
      </div>

      <div className="machine-content">
        <p className="machine-category">{category}</p>

        <h2>{name}</h2>

        <div className="machine-information">
          <span>{brand}</span>
          <span>{model}</span>
        </div>

        <div className="machine-price">
          <p>Desde</p>
          <strong>
            Q
            {pricePerDay.toLocaleString("es-GT", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </strong>
          <span>/ día</span>
        </div>

        <div className="machine-actions">
          <Link
            href={`/mrs/maquinaria/${id}`}
            className="machine-details-button"
          >
            Ver detalles
          </Link>

          <Link
            href={`/mrs/cotizar?machine=${id}`}
            className="machine-quote-button"
          >
            Cotizar
          </Link>
        </div>
      </div>
    </article>
  );
}