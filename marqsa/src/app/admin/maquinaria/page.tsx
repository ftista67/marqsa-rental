"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Machine = {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  hours: number | null;
  description: string | null;
  image: string | null;
  status: string;
  price_day: number | string;
  price_week: number | string;
  price_month: number | string;
  created_at: string;
};

type EditingMachine = {
  id: string;
  name: string;
  category: string;
  brand: string;
  model: string;
  year: string;
  hours: string;
  description: string;
  status: string;
  price_day: string;
  price_week: string;
  price_month: string;
  currentImage: string | null;
  newImage: File | null;
};

const machineStatuses = [
  "Disponible",
  "Alquilada",
  "Reservada",
  "Mantenimiento",
];

function formatMoney(value: number | string) {
  return Number(value || 0).toLocaleString("es-GT", {
    style: "currency",
    currency: "GTQ",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getStatusClass(status: string) {
  return status
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll(" ", "-");
}

function getImagePath(publicUrl: string) {
  const marker = "/storage/v1/object/public/machines/";
  const parts = publicUrl.split(marker);

  return parts.length === 2
    ? decodeURIComponent(parts[1])
    : null;
}

export default function AdminMachinesPage() {
  const router = useRouter();

  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMachine, setEditingMachine] =
    useState<EditingMachine | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | ""
  >("");

  async function loadMachines() {
    setLoading(true);
    setMessage("");
    setMessageType("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.replace("/admin/login");
      return;
    }

    const { data, error } = await supabase
      .from("machines")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(
        `No se pudo cargar la maquinaria: ${error.message}`,
      );
      setMessageType("error");
      setLoading(false);
      return;
    }

    setMachines((data ?? []) as Machine[]);
    setLoading(false);
  }

  useEffect(() => {
    void loadMachines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = useMemo(
    () => ({
      total: machines.length,
      available: machines.filter(
        (machine) => machine.status === "Disponible",
      ).length,
      rented: machines.filter(
        (machine) => machine.status === "Alquilada",
      ).length,
      maintenance: machines.filter(
        (machine) => machine.status === "Mantenimiento",
      ).length,
    }),
    [machines],
  );

  function startEditing(machine: Machine) {
    setEditingMachine({
      id: machine.id,
      name: machine.name,
      category: machine.category,
      brand: machine.brand ?? "",
      model: machine.model ?? "",
      year: machine.year ? String(machine.year) : "",
      hours: machine.hours ? String(machine.hours) : "",
      description: machine.description ?? "",
      status: machine.status,
      price_day: String(machine.price_day ?? 0),
      price_week: String(machine.price_week ?? 0),
      price_month: String(machine.price_month ?? 0),
      currentImage: machine.image,
      newImage: null,
    });

    setMessage("");
    setMessageType("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function uploadReplacementImage(
    machine: EditingMachine,
  ) {
    if (!machine.newImage) {
      return machine.currentImage;
    }

    const extension =
      machine.newImage.name.split(".").pop()?.toLowerCase() ||
      "jpg";

    const newPath = `${machine.id}/${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("machines")
      .upload(newPath, machine.newImage, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(
        `No se pudo subir la fotografía: ${uploadError.message}`,
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("machines").getPublicUrl(newPath);

    if (machine.currentImage) {
      const oldPath = getImagePath(machine.currentImage);

      if (oldPath) {
        await supabase.storage
          .from("machines")
          .remove([oldPath]);
      }
    }

    return publicUrl;
  }

  async function handleEditSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!editingMachine) return;

    setSavingId(editingMachine.id);
    setMessage("");
    setMessageType("");

    try {
      const imageUrl = await uploadReplacementImage(
        editingMachine,
      );

      const { error } = await supabase
        .from("machines")
        .update({
          name: editingMachine.name.trim(),
          category: editingMachine.category.trim(),
          brand: editingMachine.brand.trim() || null,
          model: editingMachine.model.trim() || null,
          year: editingMachine.year
            ? Number(editingMachine.year)
            : null,
          hours: editingMachine.hours
            ? Number(editingMachine.hours)
            : null,
          description:
            editingMachine.description.trim() || null,
          status: editingMachine.status,
          price_day: Number(editingMachine.price_day || 0),
          price_week: Number(editingMachine.price_week || 0),
          price_month: Number(
            editingMachine.price_month || 0,
          ),
          image: imageUrl,
        })
        .eq("id", editingMachine.id);

      if (error) {
        throw new Error(
          `No se pudo modificar la maquinaria: ${error.message}`,
        );
      }

      setEditingMachine(null);
      setMessage("La maquinaria fue actualizada correctamente.");
      setMessageType("success");
      setSavingId(null);
      await loadMachines();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la maquinaria.",
      );
      setMessageType("error");
      setSavingId(null);
    }
  }

  async function handleDelete(machine: Machine) {
    const confirmed = window.confirm(
      `¿Seguro que deseas eliminar "${machine.name}"? Esta acción no se puede deshacer.`,
    );

    if (!confirmed) return;

    setDeletingId(machine.id);
    setMessage("");
    setMessageType("");

    const { error } = await supabase
      .from("machines")
      .delete()
      .eq("id", machine.id);

    if (error) {
      setMessage(
        `No se pudo eliminar la maquinaria: ${error.message}`,
      );
      setMessageType("error");
      setDeletingId(null);
      return;
    }

    if (machine.image) {
      const imagePath = getImagePath(machine.image);

      if (imagePath) {
        await supabase.storage
          .from("machines")
          .remove([imagePath]);
      }
    }

    setMachines((current) =>
      current.filter((item) => item.id !== machine.id),
    );
    setMessage("La maquinaria fue eliminada correctamente.");
    setMessageType("success");
    setDeletingId(null);
  }

  if (loading) {
    return (
      <main className="admin-loading-page">
        <p>Cargando maquinaria...</p>
      </main>
    );
  }

  return (
    <main className="admin-machines-page">
      <header className="admin-machines-header">
        <div>
          <p>MARQSA Rental System</p>
          <h1>Administrar maquinaria</h1>
        </div>

        <div className="admin-machines-header-actions">
          <button
            type="button"
            className="admin-back-panel-button"
            onClick={() => router.push("/admin")}
          >
            Volver al panel
          </button>

          <Link
            href="/admin/maquinaria/nueva"
            className="admin-add-machine-button"
          >
            Agregar maquinaria
          </Link>
        </div>
      </header>

      {message && (
        <div
          className={`admin-form-message admin-form-message-${messageType}`}
        >
          {message}
        </div>
      )}

      {editingMachine && (
        <form
          className="machine-inline-edit-form"
          onSubmit={handleEditSubmit}
        >
          <div className="machine-inline-edit-heading">
            <div>
              <p className="section-label">
                Modificar maquinaria
              </p>
              <h2>{editingMachine.name}</h2>
            </div>

            <button
              type="button"
              onClick={() => setEditingMachine(null)}
            >
              Cancelar edición
            </button>
          </div>

          <div className="admin-form-grid">
            <label>
              Nombre
              <input
                type="text"
                value={editingMachine.name}
                onChange={(event) =>
                  setEditingMachine({
                    ...editingMachine,
                    name: event.target.value,
                  })
                }
                required
              />
            </label>

            <label>
              Categoría
              <input
                type="text"
                value={editingMachine.category}
                onChange={(event) =>
                  setEditingMachine({
                    ...editingMachine,
                    category: event.target.value,
                  })
                }
                required
              />
            </label>

            <label>
              Marca
              <input
                type="text"
                value={editingMachine.brand}
                onChange={(event) =>
                  setEditingMachine({
                    ...editingMachine,
                    brand: event.target.value,
                  })
                }
              />
            </label>

            <label>
              Modelo
              <input
                type="text"
                value={editingMachine.model}
                onChange={(event) =>
                  setEditingMachine({
                    ...editingMachine,
                    model: event.target.value,
                  })
                }
              />
            </label>

            <label>
              Año
              <input
                type="number"
                min="1900"
                max="2100"
                value={editingMachine.year}
                onChange={(event) =>
                  setEditingMachine({
                    ...editingMachine,
                    year: event.target.value,
                  })
                }
              />
            </label>

            <label>
              Horómetro
              <input
                type="number"
                min="0"
                value={editingMachine.hours}
                onChange={(event) =>
                  setEditingMachine({
                    ...editingMachine,
                    hours: event.target.value,
                  })
                }
              />
            </label>

            <label>
              Estado
              <select
                value={editingMachine.status}
                onChange={(event) =>
                  setEditingMachine({
                    ...editingMachine,
                    status: event.target.value,
                  })
                }
              >
                {machineStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Nueva fotografía
              <input
                type="file"
                accept="image/*"
                onChange={(event) =>
                  setEditingMachine({
                    ...editingMachine,
                    newImage:
                      event.target.files?.[0] ?? null,
                  })
                }
              />
            </label>
          </div>

          <div className="machine-inline-price-grid">
            <label>
              Precio por día
              <input
                type="number"
                min="0"
                step="0.01"
                value={editingMachine.price_day}
                onChange={(event) =>
                  setEditingMachine({
                    ...editingMachine,
                    price_day: event.target.value,
                  })
                }
                required
              />
            </label>

            <label>
              Precio por semana
              <input
                type="number"
                min="0"
                step="0.01"
                value={editingMachine.price_week}
                onChange={(event) =>
                  setEditingMachine({
                    ...editingMachine,
                    price_week: event.target.value,
                  })
                }
              />
            </label>

            <label>
              Precio por mes
              <input
                type="number"
                min="0"
                step="0.01"
                value={editingMachine.price_month}
                onChange={(event) =>
                  setEditingMachine({
                    ...editingMachine,
                    price_month: event.target.value,
                  })
                }
              />
            </label>
          </div>

          <label>
            Descripción
            <textarea
              rows={5}
              value={editingMachine.description}
              onChange={(event) =>
                setEditingMachine({
                  ...editingMachine,
                  description: event.target.value,
                })
              }
            />
          </label>

          <button
            type="submit"
            className="machine-inline-save-button"
            disabled={savingId === editingMachine.id}
          >
            {savingId === editingMachine.id
              ? "Guardando..."
              : "Guardar cambios"}
          </button>
        </form>
      )}

      <section className="admin-machines-summary">
        <article>
          <span>Total registrado</span>
          <strong>{summary.total}</strong>
        </article>

        <article>
          <span>Disponibles</span>
          <strong>{summary.available}</strong>
        </article>

        <article>
          <span>Alquiladas</span>
          <strong>{summary.rented}</strong>
        </article>

        <article>
          <span>Mantenimiento</span>
          <strong>{summary.maintenance}</strong>
        </article>
      </section>

      {machines.length === 0 ? (
        <section className="admin-machines-empty">
          <p className="section-label">Sin maquinaria</p>
          <h2>Aún no hay equipos registrados.</h2>

          <Link
            href="/admin/maquinaria/nueva"
            className="admin-add-machine-button"
          >
            Agregar primera máquina
          </Link>
        </section>
      ) : (
        <section className="admin-machines-grid">
          {machines.map((machine) => (
            <article
              className="admin-machine-card"
              key={machine.id}
            >
              <div className="admin-machine-card-image">
                {machine.image ? (
                  <Image
                    src={machine.image}
                    alt={machine.name}
                    fill
                    sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"
                    className="admin-machine-photo"
                  />
                ) : (
                  <div className="admin-machine-no-image">
                    Sin fotografía
                  </div>
                )}

                <span
                  className={`admin-machine-status admin-machine-status-${getStatusClass(
                    machine.status,
                  )}`}
                >
                  {machine.status}
                </span>
              </div>

              <div className="admin-machine-card-content">
                <p>{machine.category}</p>
                <h2>{machine.name}</h2>

                <div className="admin-machine-meta">
                  <span>{machine.brand || "Sin marca"}</span>
                  <span>{machine.model || "Sin modelo"}</span>
                </div>

                <div className="admin-machine-card-price">
                  <span>Precio por día</span>
                  <strong>
                    {formatMoney(machine.price_day)}
                  </strong>
                </div>

                <div className="admin-machine-card-actions">
                  <button
                    type="button"
                    onClick={() => startEditing(machine)}
                  >
                    Modificar
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleDelete(machine)}
                    disabled={deletingId === machine.id}
                  >
                    {deletingId === machine.id
                      ? "Eliminando..."
                      : "Eliminar"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}