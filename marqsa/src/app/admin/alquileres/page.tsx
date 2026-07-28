"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";

type AdminRole = "principal" | "operador";

type RentalStatus =
  | "Pendiente"
  | "Confirmado"
  | "En curso"
  | "Finalizado"
  | "Cancelado";

type Rental = {
  id: string;
  quote_number: string;
  machine_id: string;
  client_name: string;
  client_company: string | null;
  client_phone: string | null;
  client_email: string | null;
  start_date: string;
  end_date: string;
  rental_days: number;
  equipment_amount: number | string;
  operator_amount: number | string;
  transport_amount: number | string;
  total_amount: number | string;
  status: RentalStatus;
  notes: string | null;
  created_at: string;
  machines:
    | {
        name: string;
        category: string;
        brand: string | null;
        model: string | null;
      }
    | {
        name: string;
        category: string;
        brand: string | null;
        model: string | null;
      }[]
    | null;
};

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

type TabKey =
  | "Pendiente"
  | "Confirmado"
  | "En curso"
  | "Finalizado";

type EditingRental = {
  id: string;
  client_name: string;
  client_company: string;
  client_phone: string;
  client_email: string;
  start_date: string;
  end_date: string;
  equipment_amount: number;
  operator_amount: number;
  transport_amount: number;
  notes: string;
};

const tabs: { key: TabKey; label: string }[] = [
  { key: "Pendiente", label: "Solicitudes" },
  { key: "Confirmado", label: "Confirmadas" },
  { key: "En curso", label: "En curso" },
  { key: "Finalizado", label: "Finalizadas" },
];


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

  const boxLeft = margin;
  const boxRight = pageWidth - margin;
  const boxTop = 51;
  const boxBottom = 78;

  const quoteColumnLeft = boxLeft + 7;
  const statusColumnCenter = 132;
  const dateColumnRight = boxRight - 7;

  pdf.setDrawColor(70, 70, 70);
  pdf.setLineWidth(0.25);
  pdf.line(118, boxTop + 5, 118, boxBottom - 5);
  pdf.line(151, boxTop + 5, 151, boxBottom - 5);

  text(
    "NUMERO DE COTIZACION",
    quoteColumnLeft,
    60,
    7.5,
    "bold",
    gray,
  );
  text(
    data.quoteNumber,
    quoteColumnLeft,
    71,
    13.5,
    "bold",
    dark,
  );

  text(
    "ESTADO",
    statusColumnCenter,
    60,
    7.5,
    "bold",
    gray,
    "center",
  );
  text(
    getPdfStatusLabel(data.status),
    statusColumnCenter,
    71,
    11,
    "bold",
    gold,
    "center",
  );

  text(
    "FECHA DE EMISION",
    dateColumnRight,
    60,
    7.5,
    "bold",
    gray,
    "right",
  );
  text(
    formatPdfDate(data.createdAt),
    dateColumnRight,
    71,
    10,
    "bold",
    dark,
    "right",
  );

  let y = 87;

  sectionTitle("DATOS DEL CLIENTE", y);
  y += 18;
  row("Nombre", data.clientName, y);
  y += 7;
  row("Empresa", data.clientCompany || "Cliente particular", y);
  y += 7;
  row("Telefono", data.clientPhone || "No proporcionado", y);
  y += 7;
  row("Correo", data.clientEmail || "No proporcionado", y);

  y += 12;
  sectionTitle("MAQUINARIA Y PERIODO", y);
  y += 18;
  row("Equipo", data.machineName, y, true);
  y += 7;
  row("Categoria", data.machineCategory || "No especificada", y);
  y += 7;
  row(
    "Marca / Modelo",
    [data.machineBrand, data.machineModel].filter(Boolean).join(" / ") ||
      "No especificado",
    y,
  );
  y += 7;
  row(
    "Periodo",
    `${formatPdfDate(data.startDate)} al ${formatPdfDate(data.endDate)}`,
    y,
  );
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

function formatMoney(value: number | string) {
  return Number(value || 0).toLocaleString("es-GT", {
    style: "currency",
    currency: "GTQ",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getMachineName(rental: Rental) {
  if (!rental.machines) return "Máquina eliminada";

  if (Array.isArray(rental.machines)) {
    return rental.machines[0]?.name ?? "Máquina sin nombre";
  }

  return rental.machines.name;
}

function getMachineDetails(rental: Rental) {
  if (!rental.machines) {
    return {
      name: "Máquina eliminada",
      category: "No especificada",
      brand: null,
      model: null,
    };
  }

  if (Array.isArray(rental.machines)) {
    return (
      rental.machines[0] ?? {
        name: "Máquina sin nombre",
        category: "No especificada",
        brand: null,
        model: null,
      }
    );
  }

  return rental.machines;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-GT", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function calculateRentalDays(startDate: string, endDate: string) {
  if (!startDate || !endDate) return 0;

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const difference = end.getTime() - start.getTime();

  if (difference < 0) return 0;

  return Math.floor(difference / 86_400_000) + 1;
}

export default function AdminRentalsPage() {
  const router = useRouter();

  const [rentals, setRentals] = useState<Rental[]>([]);
  const [activeTab, setActiveTab] =
    useState<TabKey>("Pendiente");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] =
    useState<string | null>(null);
  const [deletingId, setDeletingId] =
    useState<string | null>(null);
  const [generatingPdfId, setGeneratingPdfId] =
    useState<string | null>(null);
  const [editingRental, setEditingRental] =
    useState<EditingRental | null>(null);
  const [adminRole, setAdminRole] =
    useState<AdminRole | null>(null);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | ""
  >("");

  async function loadRentals() {
    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.replace("/admin/login");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("admin_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !profile ||
      !["principal", "operador"].includes(profile.role)
    ) {
      setMessage("No se pudo verificar el nivel de acceso.");
      setMessageType("error");
      setLoading(false);
      return;
    }

    setAdminRole(profile.role as AdminRole);

    const { data, error } = await supabase
      .from("rentals")
      .select(
        `
          id,
          quote_number,
          machine_id,
          client_name,
          client_company,
          client_phone,
          client_email,
          start_date,
          end_date,
          rental_days,
          equipment_amount,
          operator_amount,
          transport_amount,
          total_amount,
          status,
          notes,
          created_at,
          machines (
            name,
            category,
            brand,
            model
          )
        `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(
        `No se pudieron cargar las solicitudes: ${error.message}`,
      );
      setMessageType("error");
      setLoading(false);
      return;
    }

    setRentals((data ?? []) as Rental[]);
    setLoading(false);
  }

  useEffect(() => {
    void loadRentals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRentals = useMemo(
    () =>
      rentals.filter(
        (rental) => rental.status === activeTab,
      ),
    [rentals, activeTab],
  );

  const counts = useMemo(
    () => ({
      Pendiente: rentals.filter(
        (item) => item.status === "Pendiente",
      ).length,
      Confirmado: rentals.filter(
        (item) => item.status === "Confirmado",
      ).length,
      "En curso": rentals.filter(
        (item) => item.status === "En curso",
      ).length,
      Finalizado: rentals.filter(
        (item) => item.status === "Finalizado",
      ).length,
    }),
    [rentals],
  );

  const registeredIncome = useMemo(
    () =>
      rentals
        .filter((item) =>
          ["Confirmado", "En curso", "Finalizado"].includes(
            item.status,
          ),
        )
        .reduce(
          (total, item) =>
            total + Number(item.total_amount || 0),
          0,
        ),
    [rentals],
  );

  const finalizedIncome = useMemo(
    () =>
      rentals
        .filter((item) => item.status === "Finalizado")
        .reduce(
          (total, item) =>
            total + Number(item.total_amount || 0),
          0,
        ),
    [rentals],
  );

  async function changeStatus(
    rental: Rental,
    newStatus: RentalStatus,
    successMessage: string,
  ) {
    setUpdatingId(rental.id);
    setMessage("");
    setMessageType("");

    const { error } = await supabase.rpc(
      "set_rental_status",
      {
        p_rental_id: rental.id,
        p_new_status: newStatus,
      },
    );

    if (error) {
      setMessage(
        `No se pudo actualizar la solicitud: ${error.message}`,
      );
      setMessageType("error");
      setUpdatingId(null);
      return;
    }

    setMessage(successMessage);
    setMessageType("success");
    setUpdatingId(null);
    await loadRentals();
  }

  function startEditing(rental: Rental) {
    if (adminRole !== "principal") {
      setMessage("Tu usuario no tiene permiso para modificar registros.");
      setMessageType("error");
      return;
    }

    setEditingRental({
      id: rental.id,
      client_name: rental.client_name,
      client_company: rental.client_company ?? "",
      client_phone: rental.client_phone ?? "",
      client_email: rental.client_email ?? "",
      start_date: rental.start_date,
      end_date: rental.end_date,
      equipment_amount: Number(rental.equipment_amount || 0),
      operator_amount: Number(rental.operator_amount || 0),
      transport_amount: Number(
        rental.transport_amount || 0,
      ),
      notes: rental.notes ?? "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleEditSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (adminRole !== "principal") {
      setMessage("Tu usuario no tiene permiso para modificar registros.");
      setMessageType("error");
      return;
    }

    if (!editingRental) return;

    const rentalDays = calculateRentalDays(
      editingRental.start_date,
      editingRental.end_date,
    );

    if (rentalDays <= 0) {
      setMessage("Las fechas ingresadas no son válidas.");
      setMessageType("error");
      return;
    }

    const totalAmount =
      editingRental.equipment_amount +
      editingRental.operator_amount +
      editingRental.transport_amount;

    setUpdatingId(editingRental.id);
    setMessage("");
    setMessageType("");

    const { error } = await supabase
      .from("rentals")
      .update({
        client_name: editingRental.client_name.trim(),
        client_company:
          editingRental.client_company.trim() || null,
        client_phone:
          editingRental.client_phone.trim() || null,
        client_email:
          editingRental.client_email.trim() || null,
        start_date: editingRental.start_date,
        end_date: editingRental.end_date,
        rental_days: rentalDays,
        equipment_amount:
          editingRental.equipment_amount,
        operator_amount: editingRental.operator_amount,
        transport_amount:
          editingRental.transport_amount,
        total_amount: totalAmount,
        notes: editingRental.notes.trim() || null,
      })
      .eq("id", editingRental.id);

    if (error) {
      setMessage(
        `No se pudo modificar el registro: ${error.message}`,
      );
      setMessageType("error");
      setUpdatingId(null);
      return;
    }

    setEditingRental(null);
    setMessage("El registro fue actualizado correctamente.");
    setMessageType("success");
    setUpdatingId(null);
    await loadRentals();
  }

  async function handleDelete(rental: Rental) {
    if (adminRole !== "principal") {
      setMessage("Tu usuario no tiene permiso para eliminar registros.");
      setMessageType("error");
      return;
    }

    const confirmed = window.confirm(
      `¿Seguro que deseas eliminar el registro de ${rental.client_name}? Esta acción no se puede deshacer.`,
    );

    if (!confirmed) return;

    setDeletingId(rental.id);
    setMessage("");
    setMessageType("");

    const { error } = await supabase
      .from("rentals")
      .delete()
      .eq("id", rental.id);

    if (error) {
      setMessage(
        `No se pudo eliminar el registro: ${error.message}`,
      );
      setMessageType("error");
      setDeletingId(null);
      return;
    }

    if (
      rental.status === "En curso" ||
      rental.status === "Confirmado"
    ) {
      await supabase
        .from("machines")
        .update({ status: "Disponible" })
        .eq("id", rental.machine_id);
    }

    setMessage("El registro fue eliminado correctamente.");
    setMessageType("success");
    setDeletingId(null);
    await loadRentals();
  }

  async function handleDownloadPdf(rental: Rental) {
    const machine = getMachineDetails(rental);

    try {
      setGeneratingPdfId(rental.id);

      await downloadQuotePdf({
        quoteNumber: rental.quote_number,
        status: rental.status,
        createdAt: rental.created_at,
        clientName: rental.client_name,
        clientCompany: rental.client_company,
        clientPhone: rental.client_phone,
        clientEmail: rental.client_email,
        machineName: machine.name,
        machineCategory: machine.category,
        machineBrand: machine.brand,
        machineModel: machine.model,
        startDate: rental.start_date,
        endDate: rental.end_date,
        rentalDays: rental.rental_days,
        equipmentAmount: Number(rental.equipment_amount || 0),
        operatorAmount: Number(rental.operator_amount || 0),
        transportAmount: Number(rental.transport_amount || 0),
        totalAmount: Number(rental.total_amount || 0),
        notes: rental.notes,
      });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo generar el PDF.",
      );
      setMessageType("error");
    } finally {
      setGeneratingPdfId(null);
    }
  }

  function renderWorkflowAction(rental: Rental) {
    const disabled = updatingId === rental.id;

    if (rental.status === "Pendiente") {
      return (
        <>
          <button
            type="button"
            className="rental-action-primary"
            disabled={disabled}
            onClick={() =>
              void changeStatus(
                rental,
                "Confirmado",
                "La solicitud fue aprobada.",
              )
            }
          >
            {disabled ? "Procesando..." : "Aprobar"}
          </button>

          <button
            type="button"
            className="rental-action-danger"
            disabled={disabled}
            onClick={() =>
              void changeStatus(
                rental,
                "Cancelado",
                "La solicitud fue rechazada.",
              )
            }
          >
            Rechazar
          </button>
        </>
      );
    }

    if (rental.status === "Confirmado") {
      return (
        <button
          type="button"
          className="rental-action-primary"
          disabled={disabled}
          onClick={() =>
            void changeStatus(
              rental,
              "En curso",
              "El alquiler fue iniciado.",
            )
          }
        >
          {disabled
            ? "Procesando..."
            : "Iniciar alquiler"}
        </button>
      );
    }

    if (rental.status === "En curso") {
      return (
        <button
          type="button"
          className="rental-action-primary"
          disabled={disabled}
          onClick={() =>
            void changeStatus(
              rental,
              "Finalizado",
              "El alquiler fue finalizado.",
            )
          }
        >
          {disabled
            ? "Procesando..."
            : "Finalizar alquiler"}
        </button>
      );
    }

    return null;
  }

  if (loading) {
    return (
      <main className="admin-loading-page">
        <p>Cargando solicitudes...</p>
      </main>
    );
  }

  return (
    <main className="admin-rentals-page">
      <header className="admin-rentals-header">
        <div>
          <p>MARQSA Rental System</p>
          <h1>Solicitudes y alquileres</h1>
          <span className="admin-role-label">
            Rol: {adminRole === "principal" ? "Administrador principal" : "Operador"}
          </span>
        </div>

        <div className="admin-rentals-header-actions">
          <button
            type="button"
            onClick={() => router.push("/admin")}
          >
            Volver al panel
          </button>

          <Link href="/admin/maquinaria">
            Ver maquinaria
          </Link>
        </div>
      </header>

      <section className="admin-rentals-summary">
        <article>
          <span>Solicitudes pendientes</span>
          <strong>{counts.Pendiente}</strong>
        </article>

        <article>
          <span>Alquileres en curso</span>
          <strong>{counts["En curso"]}</strong>
        </article>

        <article>
          <span>Ingresos registrados</span>
          <strong>
            {formatMoney(registeredIncome)}
          </strong>
        </article>

        <article>
          <span>Ingresos finalizados</span>
          <strong>
            {formatMoney(finalizedIncome)}
          </strong>
        </article>
      </section>

      {message && (
        <div
          className={`admin-form-message admin-form-message-${messageType}`}
        >
          {message}
        </div>
      )}

      {adminRole === "principal" && editingRental && (
        <form
          className="rental-edit-form"
          onSubmit={handleEditSubmit}
        >
          <div className="rental-edit-heading">
            <div>
              <p className="section-label">
                Modificar registro
              </p>
              <h2>Editar alquiler o ingreso</h2>
            </div>

            <button
              type="button"
              onClick={() => setEditingRental(null)}
            >
              Cancelar edición
            </button>
          </div>

          <div className="form-row">
            <label>
              Nombre del cliente
              <input
                type="text"
                value={editingRental.client_name}
                onChange={(event) =>
                  setEditingRental({
                    ...editingRental,
                    client_name: event.target.value,
                  })
                }
                required
              />
            </label>

            <label>
              Empresa
              <input
                type="text"
                value={editingRental.client_company}
                onChange={(event) =>
                  setEditingRental({
                    ...editingRental,
                    client_company: event.target.value,
                  })
                }
              />
            </label>
          </div>

          <div className="form-row">
            <label>
              Teléfono
              <input
                type="tel"
                value={editingRental.client_phone}
                onChange={(event) =>
                  setEditingRental({
                    ...editingRental,
                    client_phone: event.target.value,
                  })
                }
              />
            </label>

            <label>
              Correo
              <input
                type="email"
                value={editingRental.client_email}
                onChange={(event) =>
                  setEditingRental({
                    ...editingRental,
                    client_email: event.target.value,
                  })
                }
              />
            </label>
          </div>

          <div className="form-row">
            <label>
              Fecha de inicio
              <input
                type="date"
                value={editingRental.start_date}
                onChange={(event) =>
                  setEditingRental({
                    ...editingRental,
                    start_date: event.target.value,
                  })
                }
                required
              />
            </label>

            <label>
              Fecha de finalización
              <input
                type="date"
                min={editingRental.start_date}
                value={editingRental.end_date}
                onChange={(event) =>
                  setEditingRental({
                    ...editingRental,
                    end_date: event.target.value,
                  })
                }
                required
              />
            </label>
          </div>

          <div className="rental-edit-amounts">
            <label>
              Equipo
              <input
                type="number"
                min="0"
                step="0.01"
                value={editingRental.equipment_amount}
                onChange={(event) =>
                  setEditingRental({
                    ...editingRental,
                    equipment_amount: Number(
                      event.target.value,
                    ),
                  })
                }
              />
            </label>

            <label>
              Operador
              <input
                type="number"
                min="0"
                step="0.01"
                value={editingRental.operator_amount}
                onChange={(event) =>
                  setEditingRental({
                    ...editingRental,
                    operator_amount: Number(
                      event.target.value,
                    ),
                  })
                }
              />
            </label>

            <label>
              Transporte
              <input
                type="number"
                min="0"
                step="0.01"
                value={editingRental.transport_amount}
                onChange={(event) =>
                  setEditingRental({
                    ...editingRental,
                    transport_amount: Number(
                      event.target.value,
                    ),
                  })
                }
              />
            </label>
          </div>

          <label>
            Notas
            <textarea
              rows={4}
              value={editingRental.notes}
              onChange={(event) =>
                setEditingRental({
                  ...editingRental,
                  notes: event.target.value,
                })
              }
            />
          </label>

          <div className="rental-edit-total">
            <span>Nuevo total</span>
            <strong>
              {formatMoney(
                editingRental.equipment_amount +
                  editingRental.operator_amount +
                  editingRental.transport_amount,
              )}
            </strong>
          </div>

          <button
            type="submit"
            className="rental-edit-save"
            disabled={
              updatingId === editingRental.id
            }
          >
            {updatingId === editingRental.id
              ? "Guardando..."
              : "Guardar cambios"}
          </button>
        </form>
      )}

      <section className="rental-workflow-panel">
        <div className="rental-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={
                activeTab === tab.key
                  ? "rental-tab-active"
                  : ""
              }
              onClick={() => setActiveTab(tab.key)}
            >
              <span>{tab.label}</span>
              <strong>{counts[tab.key]}</strong>
            </button>
          ))}
        </div>

        {filteredRentals.length === 0 ? (
          <div className="admin-rentals-empty">
            No hay registros en esta sección.
          </div>
        ) : (
          <div className="admin-rental-cards">
            {filteredRentals.map((rental) => (
              <article
                className="admin-rental-card"
                key={rental.id}
              >
                <div className="admin-rental-card-top">
                  <div>
                    <span className="rental-quote-number">
                      {rental.quote_number}
                    </span>
                    <p>{getMachineName(rental)}</p>
                    <h3>{rental.client_name}</h3>
                    <span>
                      {rental.client_company ||
                        "Cliente particular"}
                    </span>
                  </div>

                  <strong>
                    {formatMoney(rental.total_amount)}
                  </strong>
                </div>

                <div className="admin-rental-card-details">
                  <div>
                    <span>Inicio</span>
                    <strong>
                      {formatDate(rental.start_date)}
                    </strong>
                  </div>

                  <div>
                    <span>Finalización</span>
                    <strong>
                      {formatDate(rental.end_date)}
                    </strong>
                  </div>

                  <div>
                    <span>Días</span>
                    <strong>{rental.rental_days}</strong>
                  </div>
                </div>

                <div className="rental-client-details">
                  {rental.client_phone && (
                    <a href={`tel:${rental.client_phone}`}>
                      {rental.client_phone}
                    </a>
                  )}

                  {rental.client_email && (
                    <a
                      href={`mailto:${rental.client_email}`}
                    >
                      {rental.client_email}
                    </a>
                  )}
                </div>

                {rental.notes && (
                  <p className="rental-notes">
                    {rental.notes}
                  </p>
                )}

                <div className="rental-workflow-actions">
                  {renderWorkflowAction(rental)}

                  <button
                    type="button"
                    className="rental-action-pdf"
                    disabled={generatingPdfId === rental.id}
                    onClick={() =>
                      void handleDownloadPdf(rental)
                    }
                  >
                    {generatingPdfId === rental.id
                      ? "Generando PDF..."
                      : "Descargar PDF"}
                  </button>

                  {adminRole === "principal" && (
                    <>
                      <button
                        type="button"
                        className="rental-action-edit"
                        onClick={() => startEditing(rental)}
                      >
                        Modificar
                      </button>

                      <button
                        type="button"
                        className="rental-action-delete"
                        disabled={deletingId === rental.id}
                        onClick={() =>
                          void handleDelete(rental)
                        }
                      >
                        {deletingId === rental.id
                          ? "Eliminando..."
                          : "Eliminar"}
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}