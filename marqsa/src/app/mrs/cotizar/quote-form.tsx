"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";


type PdfQuoteData = {
  quoteNumber: string;
  status: string;
  createdAt: string;
  clientName: string;
  clientCompany: string | null;
  clientPhone: string | null;
  clientEmail: string | null;
  machineName: string;
  machineCategory: string;
  machineBrand: string | null;
  machineModel: string | null;
  startDate: string;
  endDate: string;
  rentalDays: number;
  equipmentAmount: number;
  operatorAmount: number;
  transportAmount: number;
  totalAmount: number;
  notes: string | null;
};

type Machine = {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  model: string | null;
  price_day: number | string;
  status: string;
};

type ExistingRental = {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
};

const OPERATOR_PRICE_PER_DAY = 500;
const TRANSPORT_ESTIMATE = 2500;


async function imageUrlToDataUrl(url: string) {
  const image = new window.Image();
  image.src = url;

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () =>
      reject(new Error("No se pudo cargar el logo de MARQSA."));
  });

  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = image.naturalWidth;
  sourceCanvas.height = image.naturalHeight;

  const sourceContext = sourceCanvas.getContext("2d");

  if (!sourceContext) {
    throw new Error("No se pudo procesar el logo.");
  }

  sourceContext.drawImage(image, 0, 0);

  const imageData = sourceContext.getImageData(
    0,
    0,
    sourceCanvas.width,
    sourceCanvas.height,
  );

  const { data, width, height } = imageData;

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let hasVisiblePixel = false;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];

      if (alpha > 12) {
        hasVisiblePixel = true;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (!hasVisiblePixel) {
    return sourceCanvas.toDataURL("image/png");
  }

  const padding = Math.max(
    4,
    Math.round(Math.min(width, height) * 0.015),
  );

  const cropX = Math.max(0, minX - padding);
  const cropY = Math.max(0, minY - padding);
  const cropWidth = Math.min(
    width - cropX,
    maxX - minX + 1 + padding * 2,
  );
  const cropHeight = Math.min(
    height - cropY,
    maxY - minY + 1 + padding * 2,
  );

  const croppedCanvas = document.createElement("canvas");
  croppedCanvas.width = cropWidth;
  croppedCanvas.height = cropHeight;

  const croppedContext = croppedCanvas.getContext("2d");

  if (!croppedContext) {
    throw new Error("No se pudo recortar el logo.");
  }

  croppedContext.drawImage(
    sourceCanvas,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight,
  );

  return croppedCanvas.toDataURL("image/png");
}

async function getImageDimensions(dataUrl: string) {
  const image = new window.Image();
  image.src = dataUrl;

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () =>
      reject(new Error("No se pudo medir el logo."));
  });

  return {
    width: image.naturalWidth,
    height: image.naturalHeight,
  };
}

function getPdfStatusLabel(status: string) {
  const labels: Record<string, string> = {
    Pendiente: "PENDIENTE",
    Confirmado: "APROBADA",
    "En curso": "EN CURSO",
    Finalizado: "FINALIZADA",
    Cancelado: "CANCELADA",
  };

  return labels[status] ?? status.toUpperCase();
}

async function downloadQuotePdf(data: PdfQuoteData) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  const gold = [223, 184, 47] as const;
  const dark = [255, 255, 255] as const;
  const gray = [184, 184, 184] as const;
  const black = [11, 11, 11] as const;
  const card = [20, 20, 20] as const;
  const line = [58, 58, 58] as const;

  const logo = await imageUrlToDataUrl("/images/marqsa-logo.png");
  const logoDimensions = await getImageDimensions(logo);

  const logoBoxWidth = 48;
  const logoBoxHeight = 28;
  const logoRatio =
    logoDimensions.width / Math.max(logoDimensions.height, 1);

  let logoWidth = logoBoxWidth;
  let logoHeight = logoWidth / logoRatio;

  if (logoHeight > logoBoxHeight) {
    logoHeight = logoBoxHeight;
    logoWidth = logoHeight * logoRatio;
  }

  const logoX = margin;
  const logoY = 12 + (logoBoxHeight - logoHeight) / 2;

  function text(
    value: string,
    x: number,
    y: number,
    size = 10,
    style: "normal" | "bold" = "normal",
    color: readonly [number, number, number] = dark,
    align: "left" | "center" | "right" = "left",
  ) {
    pdf.setFont("helvetica", style);
    pdf.setFontSize(size);
    pdf.setTextColor(color[0], color[1], color[2]);
    pdf.text(value, x, y, { align });
  }

  function sectionTitle(title: string, y: number) {
    pdf.setFillColor(gold[0], gold[1], gold[2]);
    pdf.rect(margin, y, 3, 7, "F");
    text(title, margin + 7, y + 5.2, 10, "bold");
    pdf.setDrawColor(line[0], line[1], line[2]);
    pdf.line(margin, y + 10, pageWidth - margin, y + 10);
  }

  function row(
    label: string,
    value: string,
    y: number,
    valueBold = false,
  ) {
    text(label, margin, y, 9, "normal", gray);
    text(
      value,
      pageWidth - margin,
      y,
      9,
      valueBold ? "bold" : "normal",
      dark,
      "right",
    );
  }

  pdf.setFillColor(black[0], black[1], black[2]);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");
  pdf.setDrawColor(gold[0], gold[1], gold[2]);
  pdf.setLineWidth(0.35);
  pdf.rect(7, 7, pageWidth - 14, pageHeight - 14);

  pdf.addImage(
    logo,
    "PNG",
    logoX,
    logoY,
    logoWidth,
    logoHeight,
  );

  text(
    "MARQSA CONSTRUCTORA Y URBANIZADORA",
    pageWidth - margin,
    18,
    9,
    "bold",
    dark,
    "right",
  );
  text(
    "COTIZACION DE ALQUILER DE MAQUINARIA",
    pageWidth - margin,
    30,
    14.5,
    "bold",
    gold,
    "right",
  );

  pdf.setDrawColor(gold[0], gold[1], gold[2]);
  pdf.setLineWidth(0.8);
  pdf.line(margin, 45, pageWidth - margin, 45);

  pdf.setFillColor(card[0], card[1], card[2]);
  pdf.setDrawColor(gold[0], gold[1], gold[2]);
  pdf.roundedRect(margin, 51, contentWidth, 27, 2, 2, "FD");
  text("Cotización #", margin + 5, 58, 9, "normal", gray);
  text(data.quoteNumber, pageWidth - margin - 5, 58, 9, "bold", gold, "right");
  row("Fecha", formatPdfDate(data.createdAt), 65);
  row("Estado", getPdfStatusLabel(data.status), 73);

  let y = 85;
  sectionTitle("CLIENTE", y);
  y += 12;
  row("Nombre", data.clientName, y);
  y += 8;

  if (data.clientCompany) {
    row("Empresa", data.clientCompany, y);
    y += 8;
  }

  if (data.clientPhone) {
    row("Teléfono", data.clientPhone, y);
    y += 8;
  }

  if (data.clientEmail) {
    row("Correo", data.clientEmail, y);
    y += 8;
  }

  y += 5;
  sectionTitle("MAQUINARIA", y);
  y += 12;
  row("Tipo", `${data.machineCategory}`, y);
  y += 8;
  row("Nombre", data.machineName, y);
  y += 8;

  if (data.machineBrand) {
    row("Marca", data.machineBrand, y);
    y += 8;
  }

  if (data.machineModel) {
    row("Modelo", data.machineModel, y);
    y += 8;
  }

  y += 5;
  sectionTitle("DETALLES DEL ALQUILER", y);
  y += 12;
  row("Fecha de inicio", formatPdfDate(data.startDate), y);
  y += 8;
  row("Fecha de finalización", formatPdfDate(data.endDate), y);
  y += 7;
  row("Dias de alquiler", String(data.rentalDays), y);

  y += 12;
  sectionTitle("RESUMEN ECONOMICO", y);
  y += 18;
  row("Alquiler del equipo", formatPdfMoney(data.equipmentAmount), y);
  y += 8;
  row("Operador", formatPdfMoney(data.operatorAmount), y);
  y += 8;
  row("Transporte", formatPdfMoney(data.transportAmount), y);
  y += 8;

  pdf.setDrawColor(gold[0], gold[1], gold[2]);
  pdf.setLineWidth(0.5);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 11;

  text("TOTAL ESTIMADO", margin, y, 12, "bold", dark);
  text(
    formatPdfMoney(data.totalAmount),
    pageWidth - margin,
    y,
    16,
    "bold",
    gold,
    "right",
  );

  y += 15;
  sectionTitle("INFORMACION DEL PROYECTO", y);
  y += 18;

  const notes = data.notes?.trim() || "Sin observaciones adicionales.";
  const noteLines = pdf.splitTextToSize(notes, contentWidth);
  text(noteLines, margin, y, 9, "normal", dark);
  y += noteLines.length * 4.5 + 10;

  const legalText =
    "Esta cotizacion constituye una estimacion preliminar. Los precios, la disponibilidad del equipo y las condiciones del alquiler seran confirmados por MARQSA Constructora y Urbanizadora antes de formalizar el servicio.";
  const legalLines = pdf.splitTextToSize(legalText, contentWidth);

  if (y + legalLines.length * 4.3 > 260) {
    pdf.addPage();
    pdf.setFillColor(black[0], black[1], black[2]);
    pdf.rect(0, 0, pageWidth, pageHeight, "F");
    y = 24;
  }

  pdf.setFillColor(card[0], card[1], card[2]);
  pdf.setDrawColor(line[0], line[1], line[2]);
  pdf.roundedRect(
    margin,
    y,
    contentWidth,
    legalLines.length * 4.3 + 12,
    2,
    2,
    "FD",
  );
  text(legalLines, margin + 5, y + 7, 8.5, "normal", gray);

  const footerY = pageHeight - 18;
  pdf.setDrawColor(line[0], line[1], line[2]);
  pdf.line(margin, footerY - 8, pageWidth - margin, footerY - 8);

  text(
    "Sede central: Km 8.5 Ruta al Atlantico",
    margin,
    footerY,
    8,
    "normal",
    gray,
  );
  text(
    "5050-3887 | 2219-0103 | ventas@marqsa.com",
    pageWidth / 2,
    footerY,
    8,
    "normal",
    gray,
    "center",
  );
  text(
    "Marqsa Constructora y Urbanizadora",
    pageWidth - margin,
    footerY,
    8,
    "normal",
    gray,
    "right",
  );

  pdf.save(`Cotizacion-${data.quoteNumber}.pdf`);
}

function formatPdfMoney(value: number | string) {
  return `Q${Number(value || 0).toLocaleString("es-GT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPdfDate(value: string) {
  const date = value.includes("T")
    ? new Date(value)
    : new Date(`${value}T00:00:00`);

  return new Intl.DateTimeFormat("es-GT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getRentalDays(startDate: string, endDate: string) {
  if (!startDate || !endDate) return 0;

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const difference = end.getTime() - start.getTime();

  if (difference < 0) return 0;

  return Math.floor(difference / 86_400_000) + 1;
}

function datesOverlap(
  newStart: string,
  newEnd: string,
  existingStart: string,
  existingEnd: string,
) {
  const startA = new Date(`${newStart}T00:00:00`).getTime();
  const endA = new Date(`${newEnd}T00:00:00`).getTime();
  const startB = new Date(`${existingStart}T00:00:00`).getTime();
  const endB = new Date(`${existingEnd}T00:00:00`).getTime();

  return startA <= endB && endA >= startB;
}

function formatMoney(value: number) {
  return `Q${Number(value || 0).toLocaleString("es-GT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getToday() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function QuoteFormContent() {
  const searchParams = useSearchParams();
  const requestedMachineId = searchParams.get("machine");

  const [machines, setMachines] = useState<Machine[]>([]);
  const [existingRentals, setExistingRentals] = useState<ExistingRental[]>([]);

  const [machineId, setMachineId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [operatorIncluded, setOperatorIncluded] = useState(false);
  const [transportIncluded, setTransportIncluded] = useState(false);

  const [loading, setLoading] = useState(true);
  const [checkingDates, setCheckingDates] = useState(false);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | ""
  >("");
  const [submittedQuoteNumber, setSubmittedQuoteNumber] =
    useState("");
  const [submittedQuote, setSubmittedQuote] =
    useState<PdfQuoteData | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    async function loadMachines() {
      setLoading(true);
      setMessage("");
      setMessageType("");

      const { data, error } = await supabase
        .from("machines")
        .select(
          "id, name, category, brand, model, price_day, status",
        )
        .eq("status", "Disponible")
        .order("name", { ascending: true });

      if (error) {
        setMessage(`No se pudo cargar la maquinaria: ${error.message}`);
        setMessageType("error");
        setLoading(false);
        return;
      }

      const machineList = (data ?? []) as Machine[];
      setMachines(machineList);

      const requestedMachineExists =
        requestedMachineId &&
        machineList.some((machine) => machine.id === requestedMachineId);

      if (requestedMachineExists) {
        setMachineId(requestedMachineId);
      } else if (machineList.length > 0) {
        setMachineId(machineList[0].id);
      } else {
        setMachineId("");
      }

      setLoading(false);
    }

    void loadMachines();
  }, [requestedMachineId]);

  useEffect(() => {
    async function loadMachineRentals() {
      if (!machineId) {
        setExistingRentals([]);
        return;
      }

      setCheckingDates(true);

      const { data, error } = await supabase
        .from("rentals")
        .select("id, start_date, end_date, status")
        .eq("machine_id", machineId)
        .in("status", ["Confirmado", "En curso"]);

      if (error) {
        setMessage(
          `No se pudo consultar la disponibilidad: ${error.message}`,
        );
        setMessageType("error");
        setExistingRentals([]);
        setCheckingDates(false);
        return;
      }

      setExistingRentals((data ?? []) as ExistingRental[]);
      setCheckingDates(false);
    }

    void loadMachineRentals();
  }, [machineId]);

  const selectedMachine = useMemo(
    () => machines.find((machine) => machine.id === machineId) ?? null,
    [machines, machineId],
  );

  const rentalDays = useMemo(
    () => getRentalDays(startDate, endDate),
    [startDate, endDate],
  );

  const dateConflict = useMemo(() => {
    if (!startDate || !endDate) return false;

    return existingRentals.some((rental) =>
      datesOverlap(
        startDate,
        endDate,
        rental.start_date,
        rental.end_date,
      ),
    );
  }, [startDate, endDate, existingRentals]);

  const equipmentSubtotal = useMemo(() => {
    if (!selectedMachine || rentalDays <= 0) return 0;

    return Number(selectedMachine.price_day || 0) * rentalDays;
  }, [selectedMachine, rentalDays]);

  const operatorSubtotal = operatorIncluded
    ? OPERATOR_PRICE_PER_DAY * rentalDays
    : 0;

  const transportSubtotal = transportIncluded
    ? TRANSPORT_ESTIMATE
    : 0;

  const estimatedTotal =
    equipmentSubtotal + operatorSubtotal + transportSubtotal;

  function resetDates() {
    setStartDate("");
    setEndDate("");
    setMessage("");
    setMessageType("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setMessageType("");

    if (!selectedMachine || !machineId) {
      setMessage("Seleccione una máquina disponible.");
      setMessageType("error");
      return;
    }

    if (!startDate || !endDate || rentalDays <= 0) {
      setMessage("Seleccione fechas válidas para el alquiler.");
      setMessageType("error");
      return;
    }

    if (dateConflict) {
      setMessage(
        "La máquina ya tiene un alquiler confirmado en esas fechas.",
      );
      setMessageType("error");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    setSaving(true);

    const quoteData = {
      machine_id: machineId,
      client_name: String(
        formData.get("client_name") || "",
      ).trim(),
      client_company:
        String(formData.get("client_company") || "").trim() || null,
      client_phone:
        String(formData.get("client_phone") || "").trim() || null,
      client_email:
        String(formData.get("client_email") || "").trim() || null,
      start_date: startDate,
      end_date: endDate,
      rental_days: rentalDays,
      equipment_amount: equipmentSubtotal,
      operator_amount: operatorSubtotal,
      transport_amount: transportSubtotal,
      total_amount: estimatedTotal,
      status: "Pendiente",
      notes:
        String(formData.get("notes") || "").trim() || null,
    };

    const { data: quoteNumber, error } = await supabase.rpc(
      "submit_quote",
      {
        p_machine_id: quoteData.machine_id,
        p_client_name: quoteData.client_name,
        p_client_company: quoteData.client_company,
        p_client_phone: quoteData.client_phone,
        p_client_email: quoteData.client_email,
        p_start_date: quoteData.start_date,
        p_end_date: quoteData.end_date,
        p_rental_days: quoteData.rental_days,
        p_equipment_amount: quoteData.equipment_amount,
        p_operator_amount: quoteData.operator_amount,
        p_transport_amount: quoteData.transport_amount,
        p_total_amount: quoteData.total_amount,
        p_notes: quoteData.notes,
      },
    );

    if (error || !quoteNumber) {
      setMessage(
        `No se pudo enviar la solicitud: ${
          error?.message || "No se generó el número de cotización."
        }`,
      );
      setMessageType("error");
      setSaving(false);
      return;
    }

    form.reset();
    setStartDate("");
    setEndDate("");
    setOperatorIncluded(false);
    setTransportIncluded(false);
    const generatedQuoteNumber = String(quoteNumber);

    setSubmittedQuoteNumber(generatedQuoteNumber);
    setSubmittedQuote({
      quoteNumber: generatedQuoteNumber,
      status: "Pendiente",
      createdAt: new Date().toISOString(),
      clientName: quoteData.client_name,
      clientCompany: quoteData.client_company,
      clientPhone: quoteData.client_phone,
      clientEmail: quoteData.client_email,
      machineName: selectedMachine.name,
      machineCategory: selectedMachine.category,
      machineBrand: selectedMachine.brand,
      machineModel: selectedMachine.model,
      startDate: quoteData.start_date,
      endDate: quoteData.end_date,
      rentalDays: quoteData.rental_days,
      equipmentAmount: quoteData.equipment_amount,
      operatorAmount: quoteData.operator_amount,
      transportAmount: quoteData.transport_amount,
      totalAmount: quoteData.total_amount,
      notes: quoteData.notes,
    });
    setMessage("");
    setMessageType("");
    setSaving(false);
  }

  async function handleDownloadPdf() {
    if (!submittedQuote) return;

    try {
      setGeneratingPdf(true);
      await downloadQuotePdf(submittedQuote);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo generar el PDF.",
      );
      setMessageType("error");
    } finally {
      setGeneratingPdf(false);
    }
  }

  const today = getToday();

  return (
    <main className="quote-page">
      <header className="mrs-navbar">
        <div className="mrs-navbar-container">
          <Link href="/mrs" className="mrs-brand">
            <span className="mrs-brand-main">MARQSA</span>
            <span className="mrs-brand-system">Rental System</span>
          </Link>

          <nav className="mrs-navbar-links">
            <Link href="/">Página principal</Link>
            <Link href="/mrs">Maquinaria</Link>
            <Link href="/admin/login" className="mrs-admin-link">
              Administrador
            </Link>
          </nav>
        </div>
      </header>

      <section className="quote-section">
        <div className="section-container">
          <div className="quote-heading">
            <div>
              <p className="section-label">Cotizador MRS</p>

              <h1>
                Solicite un
                <span> presupuesto estimado.</span>
              </h1>
            </div>

            <p>
              Seleccione una máquina disponible, las fechas del
              alquiler y complete sus datos de contacto.
            </p>
          </div>

          {submittedQuoteNumber && (
            <section className="quote-confirmation-card">
              <p className="quote-confirmation-label">
                Solicitud enviada correctamente
              </p>

              <h2>Gracias por solicitar una cotización.</h2>

              <p>
                MARQSA revisará la disponibilidad y le enviará una
                confirmación al correo electrónico proporcionado.
              </p>

              <div className="quote-confirmation-number">
                <span>Número de cotización</span>
                <strong>{submittedQuoteNumber}</strong>
              </div>

              <p className="quote-confirmation-help">
                Conserve este número para consultar el estado de su
                solicitud.
              </p>

              <div className="quote-confirmation-actions">
                <button
                  type="button"
                  onClick={() => void handleDownloadPdf()}
                  disabled={generatingPdf}
                >
                  {generatingPdf
                    ? "Generando PDF..."
                    : "Descargar cotización PDF"}
                </button>

                <Link href="/mrs">
                  Volver al catálogo
                </Link>
              </div>
            </section>
          )}

          {message && (
            <div
              className={`admin-form-message admin-form-message-${messageType}`}
            >
              {message}
            </div>
          )}

          {loading ? (
            <div className="machines-loading-state">
              <p>Cargando maquinaria disponible...</p>
            </div>
          ) : machines.length === 0 ? (
            <div className="machines-empty-state">
              <h3>No hay maquinaria disponible.</h3>
              <p>
                Actualmente todos los equipos están alquilados,
                reservados o en mantenimiento.
              </p>

              <Link href="/mrs" className="primary-button">
                Volver al catálogo
              </Link>
            </div>
          ) : (
            <div className="quote-layout">
              <form className="quote-form" onSubmit={handleSubmit}>
                <section className="quote-form-section">
                  <h2>1. Maquinaria y fechas</h2>

                  <label>
                    Maquinaria disponible
                    <select
                      value={machineId}
                      onChange={(event) => {
                        setMachineId(event.target.value);
                        resetDates();
                      }}
                      required
                    >
                      {machines.map((machine) => (
                        <option key={machine.id} value={machine.id}>
                          {machine.name} —{" "}
                          {formatMoney(Number(machine.price_day || 0))} / día
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="form-row">
                    <label>
                      Fecha de inicio
                      <input
                        type="date"
                        min={today}
                        value={startDate}
                        onClick={(event) => {
                          event.currentTarget.showPicker?.();
                        }}
                        onChange={(event) => {
                          const value = event.target.value;
                          setStartDate(value);

                          if (endDate && endDate < value) {
                            setEndDate("");
                          }
                        }}
                        required
                      />
                    </label>

                    <label>
                      Fecha de finalización
                      <input
                        type="date"
                        min={startDate || today}
                        value={endDate}
                        disabled={!startDate}
                        onClick={(event) => {
                          if (startDate) {
                            event.currentTarget.showPicker?.();
                          }
                        }}
                        onChange={(event) =>
                          setEndDate(event.target.value)
                        }
                        required
                      />
                    </label>
                  </div>

                  {checkingDates && (
                    <p className="quote-calendar-message">
                      Consultando disponibilidad…
                    </p>
                  )}

                  {!checkingDates &&
                    startDate &&
                    endDate &&
                    dateConflict && (
                      <p className="quote-calendar-error">
                        Estas fechas están ocupadas. Seleccione otro periodo.
                      </p>
                    )}

                  {!checkingDates &&
                    startDate &&
                    endDate &&
                    !dateConflict && (
                      <p className="quote-calendar-success">
                        La máquina está disponible en estas fechas.
                      </p>
                    )}

                  <div className="quote-options">
                    <label>
                      <input
                        type="checkbox"
                        checked={operatorIncluded}
                        onChange={(event) =>
                          setOperatorIncluded(event.target.checked)
                        }
                      />

                      <span>
                        Incluir operador
                        <small>
                          Q500 estimados por cada día de alquiler.
                        </small>
                      </span>
                    </label>

                    <label>
                      <input
                        type="checkbox"
                        checked={transportIncluded}
                        onChange={(event) =>
                          setTransportIncluded(event.target.checked)
                        }
                      />

                      <span>
                        Incluir transporte
                        <small>
                          Q2,500 estimados, sujeto a ubicación.
                        </small>
                      </span>
                    </label>
                  </div>
                </section>

                <section className="quote-form-section">
                  <h2>2. Información de contacto</h2>

                  <div className="form-row">
                    <label>
                      Nombre completo
                      <input
                        type="text"
                        name="client_name"
                        placeholder="Nombre y apellido"
                        required
                      />
                    </label>

                    <label>
                      Empresa
                      <input
                        type="text"
                        name="client_company"
                        placeholder="Opcional"
                      />
                    </label>
                  </div>

                  <div className="form-row">
                    <label>
                      Teléfono o WhatsApp
                      <input
                        type="tel"
                        name="client_phone"
                        placeholder="+502"
                        required
                      />
                    </label>

                    <label>
                      Correo electrónico
                      <input
                        type="email"
                        name="client_email"
                        placeholder="correo@empresa.com"
                      />
                    </label>
                  </div>

                  <label>
                    Información del proyecto
                    <textarea
                      name="notes"
                      rows={5}
                      placeholder="Ubicación, tipo de trabajo y observaciones"
                    />
                  </label>
                </section>

                <button
                  type="submit"
                  className="quote-submit-button"
                  disabled={
                    saving ||
                    dateConflict ||
                    rentalDays <= 0
                  }
                >
                  {saving
                    ? "Enviando solicitud..."
                    : "Enviar solicitud de cotización"}
                </button>
              </form>

              <aside className="quote-summary">
                <p className="quote-summary-label">
                  Resumen estimado
                </p>

                <h2>
                  {selectedMachine?.name ??
                    "Seleccione una máquina"}
                </h2>

                <div className="quote-summary-row">
                  <span>Tarifa diaria</span>
                  <strong>
                    {selectedMachine
                      ? formatMoney(
                          Number(selectedMachine.price_day || 0),
                        )
                      : "—"}
                  </strong>
                </div>

                <div className="quote-summary-row">
                  <span>Días de alquiler</span>
                  <strong>{rentalDays || "—"}</strong>
                </div>

                <div className="quote-summary-row">
                  <span>Alquiler del equipo</span>
                  <strong>{formatMoney(equipmentSubtotal)}</strong>
                </div>

                <div className="quote-summary-row">
                  <span>Operador</span>
                  <strong>
                    {operatorIncluded
                      ? formatMoney(operatorSubtotal)
                      : "No incluido"}
                  </strong>
                </div>

                <div className="quote-summary-row">
                  <span>Transporte</span>
                  <strong>
                    {transportIncluded
                      ? formatMoney(transportSubtotal)
                      : "No incluido"}
                  </strong>
                </div>

                <div className="quote-total">
                  <span>Total estimado</span>
                  <strong>{formatMoney(estimatedTotal)}</strong>
                </div>

                <p className="quote-disclaimer">
                  Este monto es únicamente una estimación. El
                  precio final será confirmado por MARQSA según
                  ubicación, transporte y condiciones del
                  proyecto.
                </p>
              </aside>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
