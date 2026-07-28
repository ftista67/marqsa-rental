"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Machine = {
  id: string;
  name: string;
  status: string;
};

type Rental = {
  id: string;
  quote_number?: string | null;
  client_name: string;
  start_date: string;
  end_date: string;
  total_amount: number | string;
  status: string;
  created_at: string;
  machines:
    | {
        name: string;
      }
    | {
        name: string;
      }[]
    | null;
};

function formatMoney(value: number) {
  return value.toLocaleString("es-GT", {
    style: "currency",
    currency: "GTQ",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getMachineName(rental: Rental) {
  if (!rental.machines) {
    return "Máquina no disponible";
  }

  if (Array.isArray(rental.machines)) {
    return rental.machines[0]?.name ?? "Máquina sin nombre";
  }

  return rental.machines.name;
}

export default function AdminPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [adminEmail, setAdminEmail] = useState("");
  const [machines, setMachines] = useState<Machine[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  const [notification, setNotification] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const loadDashboard = useCallback(
    async (showLoader = true) => {
      if (showLoader) {
        setLoading(true);
      }

      setErrorMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/admin/login");
        return;
      }

      setAdminEmail(user.email ?? "Administrador");

      const [
        { data: machinesData, error: machinesError },
        { data: rentalsData, error: rentalsError },
      ] = await Promise.all([
        supabase
          .from("machines")
          .select("id, name, status")
          .order("name", { ascending: true }),

        supabase
          .from("rentals")
          .select(
            `
              id,
              quote_number,
              client_name,
              start_date,
              end_date,
              total_amount,
              status,
              created_at,
              machines (
                name
              )
            `,
          )
          .order("created_at", { ascending: false }),
      ]);

      if (machinesError || rentalsError) {
        setErrorMessage(
          machinesError?.message ||
            rentalsError?.message ||
            "No se pudieron cargar los datos del Dashboard.",
        );

        setLoading(false);
        return;
      }

      setMachines((machinesData ?? []) as Machine[]);
      setRentals((rentalsData ?? []) as Rental[]);
      setLoading(false);
    },
    [router],
  );

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-rental-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "rentals",
        },
        (payload) => {
          const newRental = payload.new as {
            quote_number?: string | null;
            client_name?: string | null;
            status?: string | null;
          };

          if (newRental.status !== "Pendiente") {
            return;
          }

          setNotification({
            title: "Nueva solicitud recibida",
            message: `${
              newRental.quote_number || "Nueva cotización"
            } — ${newRental.client_name || "Cliente"}`,
          });

          void loadDashboard(false);
        },
      )
      .subscribe();

    const pollingInterval = window.setInterval(() => {
      void loadDashboard(false);
    }, 30000);

    return () => {
      window.clearInterval(pollingInterval);
      void supabase.removeChannel(channel);
    };
  }, [loadDashboard]);

  useEffect(() => {
    if (!notification) return;

    const timeout = window.setTimeout(() => {
      setNotification(null);
    }, 9000);

    return () => window.clearTimeout(timeout);
  }, [notification]);

  const availableMachines = useMemo(
    () =>
      machines.filter(
        (machine) => machine.status === "Disponible",
      ).length,
    [machines],
  );

  const rentedMachines = useMemo(
    () =>
      machines.filter(
        (machine) => machine.status === "Alquilada",
      ).length,
    [machines],
  );

  const maintenanceMachines = useMemo(
    () =>
      machines.filter(
        (machine) => machine.status === "Mantenimiento",
      ).length,
    [machines],
  );

  const registeredIncome = useMemo(
    () =>
      rentals
        .filter((rental) =>
          ["Confirmado", "En curso", "Finalizado"].includes(
            rental.status,
          ),
        )
        .reduce(
          (total, rental) =>
            total + Number(rental.total_amount || 0),
          0,
        ),
    [rentals],
  );

  const finalizedIncome = useMemo(
    () =>
      rentals
        .filter((rental) => rental.status === "Finalizado")
        .reduce(
          (total, rental) =>
            total + Number(rental.total_amount || 0),
          0,
        ),
    [rentals],
  );

  const activeRentals = useMemo(
    () =>
      rentals.filter(
        (rental) => rental.status === "En curso",
      ).length,
    [rentals],
  );

  const pendingQuotes = useMemo(
    () =>
      rentals.filter(
        (rental) => rental.status === "Pendiente",
      ).length,
    [rentals],
  );

  const recentRentals = rentals.slice(0, 5);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="admin-loading-page">
        <p>Cargando panel administrativo...</p>
      </main>
    );
  }

  return (
    <main className="admin-page">
      {notification && (
        <aside className="admin-live-notification">
          <div>
            <span>Nueva actividad</span>
            <strong>{notification.title}</strong>
            <p>{notification.message}</p>
          </div>

          <div className="admin-live-notification-actions">
            <button
              type="button"
              onClick={() => {
                setNotification(null);
                router.push("/admin/alquileres");
              }}
            >
              Ver solicitud
            </button>

            <button
              type="button"
              className="admin-notification-close"
              onClick={() => setNotification(null)}
              aria-label="Cerrar notificación"
            >
              ×
            </button>
          </div>
        </aside>
      )}

      <aside className="admin-sidebar">
        <div>
          <Link href="/admin" className="admin-brand">
            <span>MARQSA</span>
            <small>Panel administrativo</small>
          </Link>

          <nav className="admin-navigation">
            <Link
              href="/admin"
              className="admin-navigation-active"
            >
              Dashboard
            </Link>

            <Link href="/admin/maquinaria">
              Maquinaria
            </Link>

            <Link href="/admin/maquinaria/nueva">
              Agregar maquinaria
            </Link>

            <Link
              href="/admin/alquileres"
              className="admin-navigation-notification-link"
            >
              <span>Alquileres</span>

              {pendingQuotes > 0 && (
                <strong>{pendingQuotes}</strong>
              )}
            </Link>
<Link href="/admin/configuracion">
  Configuración
</Link>
            <Link href="/mrs" target="_blank">
              Ver MRS
            </Link>
          </nav>
        </div>

        <button
          type="button"
          className="admin-signout-button"
          onClick={handleSignOut}
        >
          Cerrar sesión
        </button>
      </aside>

      <section className="admin-content">
        <header className="admin-topbar">
          <div>
            <p>Panel administrativo</p>
            <h1>Dashboard</h1>
          </div>

          <div className="admin-topbar-right">
            <button
              type="button"
              className={`admin-notification-button ${
                pendingQuotes > 0
                  ? "admin-notification-button-active"
                  : ""
              }`}
              onClick={() =>
                router.push("/admin/alquileres")
              }
              aria-label={`${pendingQuotes} solicitudes pendientes`}
            >
              <span aria-hidden="true">●</span>
              <strong>{pendingQuotes}</strong>
              <small>
                {pendingQuotes === 1
                  ? "Solicitud pendiente"
                  : "Solicitudes pendientes"}
              </small>
            </button>

            <div className="admin-user">
              <span>Sesión iniciada como</span>
              <strong>{adminEmail}</strong>
            </div>
          </div>
        </header>

        {errorMessage && (
          <div className="admin-form-message admin-form-message-error">
            {errorMessage}
          </div>
        )}

        <div className="admin-statistics-grid">
          <article>
            <span>Total de máquinas</span>
            <strong>{machines.length}</strong>
            <p>Equipos registrados</p>
          </article>

          <article>
            <span>Disponibles</span>
            <strong>{availableMachines}</strong>
            <p>Listas para alquilar</p>
          </article>

          <article>
            <span>Alquiladas</span>
            <strong>{rentedMachines}</strong>
            <p>Actualmente en servicio</p>
          </article>

          <article>
            <span>Ingresos registrados</span>
            <strong>{formatMoney(registeredIncome)}</strong>
            <p>Solo solicitudes aprobadas</p>
          </article>
        </div>

        <div className="admin-dashboard-secondary-stats">
          <article>
            <span>En mantenimiento</span>
            <strong>{maintenanceMachines}</strong>
          </article>

          <article>
            <span>Alquileres en curso</span>
            <strong>{activeRentals}</strong>
          </article>

          <article>
            <span>Ingresos finalizados</span>
            <strong>{formatMoney(finalizedIncome)}</strong>
          </article>

          <article
            className={
              pendingQuotes > 0
                ? "admin-pending-stat-active"
                : ""
            }
          >
            <span>Solicitudes pendientes</span>
            <strong>{pendingQuotes}</strong>

            {pendingQuotes > 0 && (
              <button
                type="button"
                onClick={() =>
                  router.push("/admin/alquileres")
                }
              >
                Revisar ahora
              </button>
            )}
          </article>
        </div>

        <div className="admin-quick-actions">
          <div className="admin-section-heading">
            <div>
              <p>Acciones rápidas</p>
              <h2>Administrar MRS</h2>
            </div>
          </div>

          <div className="admin-actions-grid">
            <Link href="/admin/maquinaria/nueva">
              <span>01</span>
              <h3>Agregar maquinaria</h3>
              <p>
                Registra un equipo nuevo con fotografía,
                estado y precios.
              </p>
            </Link>

            <button
              type="button"
              className="admin-action-card"
              onClick={() =>
                router.push("/admin/maquinaria")
              }
            >
              <span>02</span>
              <h3>Administrar maquinaria</h3>
              <p>
                Consulta equipos, cambia información o elimina
                maquinaria.
              </p>
            </button>

            <Link href="/admin/alquileres">
              <span>03</span>
              <h3>Solicitudes y alquileres</h3>
              <p>
                Revisa cotizaciones, aprueba solicitudes y
                administra alquileres.
              </p>

              {pendingQuotes > 0 && (
                <strong className="admin-action-badge">
                  {pendingQuotes} pendiente
                  {pendingQuotes === 1 ? "" : "s"}
                </strong>
              )}
            </Link>

            <Link href="/mrs" target="_blank">
              <span>04</span>
              <h3>Ver catálogo público</h3>
              <p>
                Revisa cómo aparece la maquinaria para los
                clientes de MRS.
              </p>
            </Link>
          </div>
        </div>

        <section className="admin-recent-rentals">
          <div className="admin-section-heading">
            <div>
              <p>Actividad reciente</p>
              <h2>Últimas solicitudes y alquileres</h2>
            </div>

            <Link href="/admin/alquileres">
              Ver todos
            </Link>
          </div>

          {recentRentals.length === 0 ? (
            <div className="admin-recent-rentals-empty">
              Todavía no hay solicitudes registradas.
            </div>
          ) : (
            <div className="admin-recent-rentals-list">
              {recentRentals.map((rental) => (
                <article key={rental.id}>
                  <div>
                    <p>
                      {rental.quote_number ||
                        getMachineName(rental)}
                    </p>
                    <h3>{rental.client_name}</h3>
                  </div>

                  <div>
                    <span>Fechas</span>
                    <strong>
                      {rental.start_date} — {rental.end_date}
                    </strong>
                  </div>

                  <div>
                    <span>Estado</span>
                    <strong>{rental.status}</strong>
                  </div>

                  <div>
                    <span>Total</span>
                    <strong>
                      {formatMoney(
                        Number(rental.total_amount || 0),
                      )}
                    </strong>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}