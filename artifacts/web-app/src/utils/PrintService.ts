import type { SaleWithItems } from "@workspace/api-client-react";
import type { StoreSettings } from "../hooks/useSettings";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import {
  buildInvoiceHtml,
  buildA5InvoiceHtml,
  buildThermalHtml,
  type PdfCustomer,
  type PdfSeller,
} from "./pdfTemplates";

export type { PdfSeller };

export type PrintFormat = "a4" | "a5" | "thermal";

export const FORMAT_LABELS: Record<PrintFormat, string> = {
  a4: "A4 Faktura",
  a5: "A5 Faktura",
  thermal: "80mm Termal",
};

export const FORMAT_DESC: Record<PrintFormat, string> = {
  a4: "Katta, to'liq hujjat",
  a5: "Kichik, tez chiqarish",
  thermal: "POS printer cheki",
};

export const FORMAT_ICON: Record<PrintFormat, string> = {
  a4: "description",
  a5: "article",
  thermal: "receipt",
};

export function autoSelectFormat(itemCount: number): PrintFormat {
  return itemCount <= 5 ? "a5" : "a4";
}

export function buildPrintHtml(
  sale: SaleWithItems,
  settings: StoreSettings,
  customer: PdfCustomer | null | undefined,
  format: PrintFormat,
  seller?: PdfSeller | null,
): string {
  switch (format) {
    case "a4": return buildInvoiceHtml(sale, settings, customer, seller);
    case "a5": return buildA5InvoiceHtml(sale, settings, customer, seller);
    case "thermal": return buildThermalHtml(sale, settings, customer, seller);
  }
}

export function printDoc(html: string): void {
  const iframe = document.createElement("iframe");
  iframe.style.position = "absolute";
  iframe.style.width = "0px";
  iframe.style.height = "0px";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();

    // Wait for resources to load, then print and clean up
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 500);
  } else {
    // Fallback to popup if iframe fails
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 500);
    } else {
      alert("Popup va iframe to'sib qo'yildi. Iltimos, ruxsat bering.");
    }
  }
}

export async function sharePdf(html: string, filename: string): Promise<void> {
  // On web, "sharing" a PDF directly is best achieved by generating a blob and downloading it,
  // or triggering navigator.share if supported (e.g. mobile Chrome/Safari).
  const blob = new Blob([html], { type: "text/html" });
  
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: "text/html" })] })) {
    try {
      const file = new File([blob], filename, { type: "text/html" });
      await navigator.share({
        files: [file],
        title: filename,
        text: "Smart-Boss-Control: Savdo cheki",
      });
      return;
    } catch (e) {
      // Ignore abort, fallback to download on other errors
    }
  }

  // Fallback: Download the HTML print page (which prints perfectly when opened)
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.replace(/\.pdf$/, ".html"); // HTML is universal for print
  a.click();
  URL.revokeObjectURL(url);
}

export async function generateReceiptPdfBlob(html: string): Promise<Blob> {
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "-9999px";
  container.style.width = "650px"; // width for rendering
  container.style.background = "white";
  container.innerHTML = html;
  document.body.appendChild(container);

  // Wait a small bit for any images or styles to load/render
  await new Promise((resolve) => setTimeout(resolve, 300));

  try {
    const canvas = await html2canvas(container, {
      scale: 2, // High resolution
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL("image/png");
    
    // A4 dimensions (A4 is 210mm x 297mm)
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    // Add first page
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Handle multi-page if receipt is longer than A4 height
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    return pdf.output("blob");
  } finally {
    document.body.removeChild(container);
  }
}

export default {
  FORMAT_LABELS,
  FORMAT_DESC,
  FORMAT_ICON,
  autoSelectFormat,
  buildPrintHtml,
  printDoc,
  sharePdf,
  generateReceiptPdfBlob,
};
