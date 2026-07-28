"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type SiteSettings = {
  id: number;
  company_name: string;
  address: string;
  phone_1: string;
  phone_2: string;
  email: string;
  social_name: string;
  schedule: string;
  operator_price: number | string;
  transport_price: number | string;
};

export default function AdminSettingsPage() {
  const router = useRouter();

  const [settings, setSettings] =
    useState<SiteSettings | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | ""
  >("");

  useEffect(() => {
    async function loadSettings() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/admin/login");
        return;
      }

      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .eq("id", 1)
        .single();

      if (error) {
        setMessage(
          `No se pudo cargar la configuración: ${error.message}`,
        );
        setMessageType("error");
        setLoading(false);
        return;
      }

      setSettings(data as SiteSettings);
      setLoading(false);
    }

    void loadSettings();
  }, [router]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!settings) return;

    setSaving(true);
    setMessage("");
    setMessageType("");

    const { error } = await supabase
      .from("site_settings")
      .update({
        company_name: settings.company_name.trim(),
        address: settings.address.trim(),
        phone_1: settings.phone_1.trim(),
        phone_2: settings.phone_2.trim(),
        email: settings.email.trim(),
        social_name: settings.social_name.trim(),
        schedule: settings.schedule.trim(),
        operator_price: Number(settings.operator_price || 0),
        transport_price: Number(
          settings.transport_price || 0,
        ),
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (error) {
      setMessage(
        `No se pudo guardar la configuración: ${error.message}`,
      );
      setMessageType("error");
      setSaving(false);
      return;
    }

    setMessage("Configuración actualizada correctamente.");
    setMessageType("success");
    setSaving(false);
  }

  if (loading) {
    return (
      <main className="admin-loading-page">
        <p>Cargando configuración...</p>
      </main>
    );
  }

  if (!settings) {
    return (
      <main className="admin-loading-page">
        <p>No se encontró la configuración.</p>
      </main>
    );
  }

  return (
    <main className="admin-settings-page">
      <header className="admin-settings-header">
        <div>
          <p>MARQSA Rental System</p>
          <h1>Configuración</h1>
        </div>

        <button
          type="button"
          onClick={() => router.push("/admin")}
        >
          Volver al panel
        </button>
      </header>

      {message && (
        <div
          className={`admin-form-message admin-form-message-${messageType}`}
        >
          {message}
        </div>
      )}

      <form
        className="admin-settings-form"
        onSubmit={handleSubmit}
      >
        <section>
          <p className="section-label">
            Información corporativa
          </p>

          <h2>Datos generales</h2>

          <div className="admin-form-grid">
            <label>
              Nombre de la empresa
              <input
                type="text"
                value={settings.company_name}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    company_name: event.target.value,
                  })
                }
                required
              />
            </label>

            <label>
              Dirección
              <input
                type="text"
                value={settings.address}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    address: event.target.value,
                  })
                }
                required
              />
            </label>

            <label>
              Teléfono principal
              <input
                type="text"
                value={settings.phone_1}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    phone_1: event.target.value,
                  })
                }
                required
              />
            </label>

            <label>
              Teléfono secundario
              <input
                type="text"
                value={settings.phone_2}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    phone_2: event.target.value,
                  })
                }
              />
            </label>

            <label>
              Correo
              <input
                type="email"
                value={settings.email}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    email: event.target.value,
                  })
                }
                required
              />
            </label>

            <label>
              Redes sociales
              <input
                type="text"
                value={settings.social_name}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    social_name: event.target.value,
                  })
                }
              />
            </label>
          </div>

          <label>
            Horario de atención
            <input
              type="text"
              value={settings.schedule}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  schedule: event.target.value,
                })
              }
            />
          </label>
        </section>

        <section>
          <p className="section-label">
            Tarifas del sistema
          </p>

          <h2>Valores predeterminados</h2>

          <div className="admin-form-grid">
            <label>
              Precio diario del operador
              <input
                type="number"
                min="0"
                step="0.01"
                value={settings.operator_price}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    operator_price: event.target.value,
                  })
                }
                required
              />
            </label>

            <label>
              Transporte estimado
              <input
                type="number"
                min="0"
                step="0.01"
                value={settings.transport_price}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    transport_price:
                      event.target.value,
                  })
                }
                required
              />
            </label>
          </div>
        </section>

        <button
          type="submit"
          className="admin-settings-save"
          disabled={saving}
        >
          {saving
            ? "Guardando..."
            : "Guardar configuración"}
        </button>
      </form>
    </main>
  );
}