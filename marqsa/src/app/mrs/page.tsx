"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import MachineCard from "@/components/MachineCard";
import { supabase } from "@/lib/supabase";

type MachineStatus =
  | "Disponible"
  | "Alquilada"
  | "Mantenimiento"
  | "Reservada";

type DatabaseMachine = {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  model: string | null;
  image: string | null;
  status: MachineStatus;
  price_day: number | string;
  created_at: string;
};

type PublicMachine = {
  id: string;
  name: string;
  category: string;
  brand: string;
  model: string;
  image?: string;
  status: MachineStatus;
  pricePerDay: number;
};

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export default function MrsPage() {
  const [machines, setMachines] = useState<PublicMachine[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState("Todos");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadMachines() {
      setLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("machines")
        .select(
          `
            id,
            name,
            category,
            brand,
            model,
            image,
            status,
            price_day,
            created_at
          `,
        )
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMessage(
          `No se pudo cargar la maquinaria: ${error.message}`,
        );
        setLoading(false);
        return;
      }

      const formattedMachines = (
        (data ?? []) as DatabaseMachine[]
      ).map((machine) => ({
        id: machine.id,
        name: machine.name,
        category: machine.category,
        brand: machine.brand || "Sin marca",
        model: machine.model || "Sin modelo",
        image: machine.image || undefined,
        status: machine.status,
        pricePerDay: Number(machine.price_day || 0),
      }));

      setMachines(formattedMachines);
      setLoading(false);
    }

    void loadMachines();
  }, []);

  const categories = useMemo(() => {
    const categoryList = machines
      .map((machine) => machine.category.trim())
      .filter(Boolean);

    return ["Todos", ...Array.from(new Set(categoryList))];
  }, [machines]);

  const filteredMachines = useMemo(() => {
    const normalizedSearch = normalizeSearchText(searchTerm);

    return machines.filter((machine) => {
      const matchesCategory =
        selectedCategory === "Todos" ||
        machine.category === selectedCategory;

      const matchesAvailability =
        !onlyAvailable || machine.status === "Disponible";

      const searchableText = normalizeSearchText(
        [
          machine.name,
          machine.brand,
          machine.model,
          machine.category,
          machine.status,
        ].join(" "),
      );

      const matchesSearch =
        normalizedSearch === "" ||
        searchableText.includes(normalizedSearch);

      return (
        matchesCategory &&
        matchesAvailability &&
        matchesSearch
      );
    });
  }, [
    machines,
    selectedCategory,
    onlyAvailable,
    searchTerm,
  ]);

  function clearFilters() {
    setSearchTerm("");
    setSelectedCategory("Todos");
    setOnlyAvailable(false);
  }

  return (
    <main className="mrs-page">
      <header className="mrs-navbar">
        <div className="mrs-navbar-container">
          <Link href="/" className="mrs-brand">
            <span className="mrs-brand-main">MARQSA</span>
            <span className="mrs-brand-system">
              Rental System
            </span>
          </Link>

          <nav className="mrs-navbar-links">
            <Link href="/">Página principal</Link>

            <Link href="#catalogo">
              Maquinaria
            </Link>

            <Link
              href="/admin/login"
              className="mrs-admin-link"
            >
              Administrador
            </Link>

            <Link
              href="/mrs/cotizar"
              className="mrs-navbar-quote"
            >
              Solicitar cotización
            </Link>
          </nav>
        </div>
      </header>

      <section className="mrs-hero">
        <div className="mrs-hero-overlay" />

        <div className="mrs-hero-content">
          <p className="section-label">
            MARQSA Rental System
          </p>

          <h1>
            Maquinaria para
            <span> grandes proyectos.</span>
          </h1>

          <p>
            Consulte disponibilidad, conozca precios estimados
            y solicite una cotización oficial para su proyecto.
          </p>

          <div className="mrs-hero-actions">
            <a href="#catalogo" className="primary-button">
              Ver maquinaria
            </a>

            <Link
              href="/mrs/cotizar"
              className="secondary-button"
            >
              Cotizar ahora
            </Link>
          </div>
        </div>
      </section>

      <section
        id="catalogo"
        className="machine-catalog"
      >
        <div className="section-container">
          <div className="machine-catalog-heading">
            <div>
              <p className="section-label">Catálogo MRS</p>

              <h2>
                Maquinaria disponible para alquiler.
              </h2>
            </div>

            <p>
              Los precios mostrados son estimados. La
              cotización final puede variar según fechas,
              ubicación, transporte y condiciones del proyecto.
            </p>
          </div>

          {loading ? (
            <div className="machines-loading-state">
              <p>Cargando maquinaria...</p>
            </div>
          ) : errorMessage ? (
            <div className="machines-error-state">
              <h3>No se pudo cargar el catálogo.</h3>
              <p>{errorMessage}</p>
            </div>
          ) : machines.length === 0 ? (
            <div className="machines-empty-state">
              <h3>
                Actualmente no hay maquinaria publicada.
              </h3>

              <p>
                Vuelva a consultar próximamente o contacte a
                MARQSA.
              </p>
            </div>
          ) : (
            <>
              <div className="machine-search-panel">
                <div className="machine-search-box">
                  <span aria-hidden="true">⌕</span>

                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) =>
                      setSearchTerm(event.target.value)
                    }
                    placeholder="Buscar por nombre, marca, modelo o categoría"
                    aria-label="Buscar maquinaria"
                  />

                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm("")}
                      aria-label="Limpiar búsqueda"
                    >
                      Limpiar
                    </button>
                  )}
                </div>

                <div className="machine-search-results">
                  <span>
                    {filteredMachines.length}{" "}
                    {filteredMachines.length === 1
                      ? "resultado"
                      : "resultados"}
                  </span>

                  {(searchTerm ||
                    selectedCategory !== "Todos" ||
                    onlyAvailable) && (
                    <button
                      type="button"
                      onClick={clearFilters}
                    >
                      Restablecer filtros
                    </button>
                  )}
                </div>
              </div>

              <div className="machine-filters">
                <div className="machine-category-filters">
                  {categories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      className={
                        selectedCategory === category
                          ? "machine-filter-active"
                          : ""
                      }
                      onClick={() =>
                        setSelectedCategory(category)
                      }
                    >
                      {category}
                    </button>
                  ))}
                </div>

                <label className="availability-filter">
                  <input
                    type="checkbox"
                    checked={onlyAvailable}
                    onChange={(event) =>
                      setOnlyAvailable(
                        event.target.checked,
                      )
                    }
                  />

                  Mostrar solo disponibles
                </label>
              </div>

              {filteredMachines.length > 0 ? (
                <div className="machines-grid">
                  {filteredMachines.map((machine) => (
                    <MachineCard
                      key={machine.id}
                      {...machine}
                    />
                  ))}
                </div>
              ) : (
                <div className="machines-empty-state">
                  <h3>
                    No encontramos maquinaria con esos filtros.
                  </h3>

                  <p>
                    Pruebe con otra palabra o restablezca los
                    filtros.
                  </p>

                  <button
                    type="button"
                    className="machine-reset-button"
                    onClick={clearFilters}
                  >
                    Restablecer filtros
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}