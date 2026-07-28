"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setErrorMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMessage("El correo o la contraseña son incorrectos.");
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <Link href="/" className="admin-login-brand">
          <span>MARQSA</span>
          <small>Panel administrativo</small>
        </Link>

        <div className="admin-login-heading">
          <p className="section-label">Acceso privado</p>
          <h1>Iniciar sesión</h1>

          <p>
            Acceso exclusivo para administradores de MARQSA Rental System.
          </p>
        </div>

        <form className="admin-login-form" onSubmit={handleSubmit}>
          <label>
            Correo electrónico
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Usuario"
              autoComplete="email"
              required
            />
          </label>

          <label>
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Contraseña"
              autoComplete="current-password"
              required
            />
          </label>

          {errorMessage && (
            <p className="admin-login-error">{errorMessage}</p>
          )}

          <button type="submit" disabled={loading}>
            {loading ? "Ingresando..." : "Ingresar al panel"}
          </button>
        </form>

        <Link href="/" className="admin-login-return">
          ← Volver a MARQSA
        </Link>
      </section>
    </main>
  );
}   