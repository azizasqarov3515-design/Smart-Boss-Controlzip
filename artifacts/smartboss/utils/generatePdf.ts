import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Alert, Platform } from "react-native";

export type DocType = "invoice" | "receipt" | "waybill";

const DOC_LABELS: Record<DocType, { uz: string; prefix: string }> = {
  invoice: { uz: "Hisob-faktura", prefix: "INV" },
  receipt: { uz: "Savdo cheki", prefix: "RCP" },
  waybill: { uz: "Yuk xati", prefix: "WB" },
};

export async function generateAndSharePdf(
  html: string,
  saleId: number,
  docType: DocType
): Promise<void> {
  const label = DOC_LABELS[docType];

  try {
    if (Platform.OS === "web") {
      const win = window.open("", "_blank");
      if (!win) {
        Alert.alert(
          "Bloklandi",
          "Brauzer popup-ni bloklamoqda. Iltimos, ruxsat bering va qayta urinib ko'ring."
        );
        return;
      }
      win.document.write(html);
      win.document.close();
      setTimeout(() => {
        win.print();
      }, 600);
      return;
    }

    // Native: generate PDF then share
    const { uri } = await Print.printToFileAsync({ html, base64: false });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: `${label.uz} — saqlash yoki ulashish`,
        UTI: "com.adobe.pdf",
      });
    } else {
      Alert.alert(
        "Saqlandi",
        `PDF saqlandi:\n${uri}`
      );
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Noma'lum xato";
    Alert.alert("Xato", `PDF yaratishda xato: ${msg}`);
  }
}
