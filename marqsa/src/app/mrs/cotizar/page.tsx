import { Suspense } from "react";
import { QuoteFormContent } from "./quote-form";

function LoadingState() {
  return (
    <main className="quote-page">
      <header className="mrs-navbar">
        <div className="mrs-navbar-container">
          <div className="mrs-brand">
            <span className="mrs-brand-main">MARQSA</span>
            <span className="mrs-brand-system">Rental System</span>
          </div>
        </div>
      </header>

      <section className="quote-section">
        <div className="section-container">
          <div className="machines-loading-state">
            <p>Cargando maquinaria disponible...</p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function QuotePage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <QuoteFormContent />
    </Suspense>
  );
}
