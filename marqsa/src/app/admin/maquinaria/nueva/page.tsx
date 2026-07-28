"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const statuses = [
  "Disponible",
  "Reservada",
  "Alquilada",
  "Mantenimiento",
];

export default function NewMachinePage() {
  const router = useRouter();

  const [checkingSession, setCheckingSession] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  useEffect(() => {
    async function verifyUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/admin/login");
        return;
      }

      setCheckingSession(false);
    }

    verifyUser();
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setMessage("");
    setMessageType("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    const imageFile = formData.get("image") as File;
    let imageUrl: string | null = null;
    let uploadedImagePath: string | null = null;

    try {
      if (imageFile && imageFile.size > 0) {
        const extension = imageFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const safeName = crypto.randomUUID();
        uploadedImagePath = `${safeName}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("machines")
          .upload(uploadedImagePath, imageFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`No se pudo subir la imagen: ${uploadError.message}`);
        }

        const { data: publicUrlData } = supabase.storage
          .from("machines")
          .getPublicUrl(uploadedImagePath);

        imageUrl = publicUrlData.publicUrl;
      }

      const machineData = {
        name: String(formData.get("name") || "").trim(),
        category: String(formData.get("category") || "").trim(),
        brand: String(formData.get("brand") || "").trim(),
        model: String(formData.get("model") || "").trim(),
        year: Number(formData.get("year")) || null,
        hours: Number(formData.get("hours")) || 0,
        description: String(formData.get("description") || "").trim(),
        image: imageUrl,
        status: String(formData.get("status") || "Disponible"),
        price_day: Number(formData.get("price_day")) || 0,
        price_week: Number(formData.get("price_week")) || 0,
        price_month: Number(formData.get("price_month")) || 0,
      };

      const { error: insertError } = await supabase
        .from("machines")
        .insert(machineData);

      if (insertError) {
        if (uploadedImagePath) {
          await supabase.storage
            .from("machines")
            .remove([uploadedImagePath]);
        }

        throw new Error(
          `No se pudo guardar la maquinaria: ${insertError.message}`,
        );
      }

      form.reset();
      setMessage("La maquinaria fue agregada correctamente.");
      setMessageType("success");

      setTimeout(() => {
        router.push("/admin/maquinaria");
        router.refresh();
      }, 1200);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Ocurrió un error al guardar la maquinaria.";

      setMessage(errorMessage);
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="admin-loading-page">
        <p>Verificando acceso administrativo...</p>
      </main>
    );
  }

  return (
    <main className="admin-form-page">
      <header className="admin-form-header">
        <div>
          <p>MARQSA Rental System</p>
          <h1>Agregar maquinaria</h1>
        </div>

        <Link href="/admin" className="admin-form-back">
          ← Volver al panel
        </Link>
      </header>

      <form className="admin-machine-form" onSubmit={handleSubmit}>
        <section className="admin-form-section">
          <div className="admin-form-section-heading">
            <span>01</span>

            <div>
              <h2>Información principal</h2>
              <p>Datos con los que aparecerá el equipo en MRS.</p>
            </div>
          </div>

          <div className="admin-form-grid">
            <label>
              Nombre de la maquinaria
              <input
                type="text"
                name="name"
                placeholder="Ej. Excavadora CAT 320"
                required
              />
            </label>

            <label>
              Categoría
              <input
                type="text"
                name="category"
                placeholder="Ej. Excavadoras"
                required
              />
            </label>

            <label>
              Marca
              <input
                type="text"
                name="brand"
                placeholder="Ej. Caterpillar"
              />
            </label>

            <label>
              Modelo
              <input
                type="text"
                name="model"
                placeholder="Ej. 320"
              />
            </label>

            <label>
              Año
              <input
                type="number"
                name="year"
                min="1950"
                max="2100"
                placeholder="2021"
              />
            </label>

            <label>
              Horómetro
              <input
                type="number"
                name="hours"
                min="0"
                step="1"
                placeholder="4200"
              />
            </label>

            <label>
              Estado
              <select name="status" defaultValue="Disponible">
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Fotografía principal
              <input
                type="file"
                name="image"
                accept="image/png,image/jpeg,image/webp"
              />
            </label>
          </div>

          <label className="admin-form-full-width">
            Descripción
            <textarea
              name="description"
              rows={5}
              placeholder="Describa las características y usos principales del equipo."
            />
          </label>
        </section>

        <section className="admin-form-section">
          <div className="admin-form-section-heading">
            <span>02</span>

            <div>
              <h2>Precios de alquiler</h2>
              <p>Estos precios aparecerán como referencia en el catálogo.</p>
            </div>
          </div>

          <div className="admin-form-grid admin-price-grid">
            <label>
              Precio por día
              <input
                type="number"
                name="price_day"
                min="0"
                step="0.01"
                placeholder="2800"
                required
              />
            </label>

            <label>
              Precio por semana
              <input
                type="number"
                name="price_week"
                min="0"
                step="0.01"
                placeholder="16800"
              />
            </label>

            <label>
              Precio por mes
              <input
                type="number"
                name="price_month"
                min="0"
                step="0.01"
                placeholder="56000"
              />
            </label>
          </div>
        </section>

        {message && (
          <div
            className={`admin-form-message admin-form-message-${messageType}`}
          >
            {message}
          </div>
        )}

        <div className="admin-form-actions">
          <Link href="/admin" className="admin-cancel-button">
            Cancelar
          </Link>

          <button type="submit" disabled={saving}>
            {saving ? "Guardando..." : "Guardar maquinaria"}
          </button>
        </div>
      </form>
    </main>
  );
}