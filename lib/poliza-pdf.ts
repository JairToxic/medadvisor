import "server-only";
import PDFDocument from "pdfkit";
import type { Paciente } from "@/lib/tipos";
import { SEED_HOSPITALES } from "@/lib/hospitales-seed";

const COLOR_PRIMARIO = "#0c5b56";
const COLOR_TEXTO = "#14201f";
const COLOR_TENUE = "#6b7878";

const HOSPITALES_POR_ID = Object.fromEntries(SEED_HOSPITALES.map((h) => [h.id, h]));

export function generarPolizaPdf(paciente: Paciente): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc
      .fillColor(COLOR_PRIMARIO)
      .fontSize(22)
      .text(paciente.insurer, 50, 50)
      .fontSize(10)
      .fillColor(COLOR_TENUE)
      .text(`Plan ${paciente.plan}`, 50, 78)
      .text(`Póliza N° ${paciente.policyNo}`, 50, 92);

    doc
      .moveTo(50, 115)
      .lineTo(545, 115)
      .strokeColor(COLOR_PRIMARIO)
      .lineWidth(2)
      .stroke();

    let y = 135;
    seccion(doc, "ASEGURADO", y);
    y += 22;
    par(doc, "Nombre", paciente.name, y);
    y += 18;
    par(doc, "Edad", `${paciente.age} años`, y);
    y += 18;
    par(doc, "Ciudad", paciente.city, y);
    y += 18;
    par(
      doc,
      "Pre-existencias declaradas",
      paciente.preexisting.join(", ") || "ninguna",
      y,
    );
    y += 30;

    seccion(doc, "VIGENCIA Y ESTADO", y);
    y += 22;
    par(doc, "Vigencia", paciente.validity, y);
    y += 18;
    par(doc, "Estado", "VIGENTE", y);
    y += 30;

    seccion(doc, "DEDUCIBLE", y);
    y += 22;
    par(doc, "Deducible anual", `$${paciente.deductible.annual}`, y);
    y += 18;
    par(doc, "Consumido en el año", `$${paciente.deductible.used}`, y);
    y += 18;
    par(
      doc,
      "Pendiente",
      `$${paciente.deductible.annual - paciente.deductible.used}`,
      y,
    );
    y += 30;

    seccion(doc, "COBERTURAS", y);
    y += 22;
    tablaCabecera(doc, ["Tipo", "Porcentaje cubierto"], y);
    y += 22;
    for (const cov of paciente.coverages) {
      tablaFila(doc, [cov.type.es, `${cov.pct}%`], y);
      y += 20;
    }
    y += 14;

    seccion(doc, "RED PREFERENTE DE HOSPITALES", y);
    y += 22;
    for (const id of paciente.network) {
      const h = HOSPITALES_POR_ID[id];
      if (!h) continue;
      par(doc, "•", `${h.name} (${h.city})`, y);
      y += 18;
    }
    y += 20;

    doc
      .fontSize(8)
      .fillColor(COLOR_TENUE)
      .text(
        "Documento ficticio generado para HackIAthon Viamatica 2026. Aseguradoras y datos de pacientes son inventados.",
        50,
        780,
        { width: 495, align: "center" },
      );

    doc.end();
  });
}

function seccion(doc: PDFKit.PDFDocument, titulo: string, y: number) {
  doc.font("Helvetica-Bold").fontSize(11).fillColor(COLOR_PRIMARIO).text(titulo, 50, y);
}

function par(doc: PDFKit.PDFDocument, etiqueta: string, valor: string, y: number) {
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(COLOR_TENUE)
    .text(`${etiqueta}:`, 60, y, { width: 220, continued: false });
  doc.fillColor(COLOR_TEXTO).text(valor, 220, y);
}

function tablaCabecera(doc: PDFKit.PDFDocument, cols: string[], y: number) {
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(COLOR_TEXTO)
    .rect(50, y - 4, 495, 22)
    .fillAndStroke("#efece5", "#e3ddd1");
  doc.fillColor(COLOR_TEXTO).text(cols[0], 60, y + 2);
  doc.text(cols[1], 320, y + 2);
}

function tablaFila(doc: PDFKit.PDFDocument, cols: string[], y: number) {
  doc.rect(50, y - 4, 495, 20).strokeColor("#e3ddd1").lineWidth(0.6).stroke();
  doc.font("Helvetica").fontSize(10).fillColor(COLOR_TEXTO);
  doc.text(cols[0], 60, y);
  doc.text(cols[1], 320, y);
}
