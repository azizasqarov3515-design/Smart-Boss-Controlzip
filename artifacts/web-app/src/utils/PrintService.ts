import type { SaleWithItems } from "@workspace/api-client-react";
import type { StoreSettings } from "../hooks/useSettings";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import {
  buildInvoiceHtml,
  buildA5InvoiceHtml,
  buildThermalHtml,
  buildWaybillHtml,
  type PdfCustomer,
  type PdfSeller,
} from "./pdfTemplates";

export type { PdfSeller };

export type PrintFormat = "a4" | "a5" | "thermal" | "waybill";

export const FORMAT_LABELS: Record<PrintFormat, string> = {
  a4: "A4 Faktura",
  a5: "A5 Faktura",
  waybill: "Yuk xati",
  thermal: "80mm Termal",
};

export const FORMAT_DESC: Record<PrintFormat, string> = {
  a4: "Katta, to'liq hujjat",
  a5: "Kichik, tez chiqarish",
  waybill: "Yuk tashish hujjati",
  thermal: "POS printer cheki",
};

export const FORMAT_ICON: Record<PrintFormat, string> = {
  a4: "description",
  a5: "article",
  waybill: "local_shipping",
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
    case "waybill": return buildWaybillHtml(sale, settings, customer, seller);
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

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const margin = 15; // 1.5cm = 15mm margin
    const printableWidth = 210 - (margin * 2); // 180mm
    const printableHeight = 297 - (margin * 2); // 267mm

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Calculate how many pixels on the canvas correspond to the printable height
    const pxPageHeight = (canvasWidth * printableHeight) / printableWidth;

    let srcY = 0;
    let pageNum = 0;

    while (srcY < canvasHeight) {
      if (pageNum > 0) {
        pdf.addPage();
      }

      // Height of the chunk to crop
      const currentChunkHeight = Math.min(pxPageHeight, canvasHeight - srcY);

      // Create a temporary canvas for this page chunk
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvasWidth;
      tempCanvas.height = currentChunkHeight;
      const ctx = tempCanvas.getContext("2d");

      if (ctx) {
        // Draw the chunk from the main canvas onto the temp canvas
        ctx.drawImage(
          canvas,
          0, srcY, canvasWidth, currentChunkHeight, // source rect
          0, 0, canvasWidth, currentChunkHeight     // dest rect
        );
      }

      const chunkImgData = tempCanvas.toDataURL("image/png");
      const destHeight = (currentChunkHeight * printableWidth) / canvasWidth;

      pdf.addImage(chunkImgData, "PNG", margin, margin, printableWidth, destHeight);

      srcY += pxPageHeight;
      pageNum++;
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
