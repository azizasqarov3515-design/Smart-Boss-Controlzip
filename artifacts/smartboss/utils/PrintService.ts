import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type { SaleWithItems } from "@workspace/api-client-react";
import type { StoreSettings } from "@/hooks/useSettings";
import {
  buildInvoiceHtml,
  buildA5InvoiceHtml,
  buildThermalHtml,
  type PdfCustomer,
} from "./pdfTemplates";

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
): string {
  switch (format) {
    case "a4": return buildInvoiceHtml(sale, settings, customer);
    case "a5": return buildA5InvoiceHtml(sale, settings, customer);
    case "thermal": return buildThermalHtml(sale, settings, customer);
  }
}

export async function printDoc(html: string): Promise<void> {
  await Print.printAsync({ html });
}

export async function sharePdf(html: string, filename: string): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html });
  const available = await Sharing.isAvailableAsync();
  if (!available) throw new Error("Ulashish ushbu qurilmada mavjud emas");
  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    dialogTitle: filename,
    UTI: "com.adobe.pdf",
  });
}
