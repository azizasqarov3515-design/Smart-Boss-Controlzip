import type { SaleWithItems } from "@workspace/api-client-react";
import type { StoreSettings } from "../hooks/useSettings";
import { DEFAULT_SETTINGS } from "../hooks/useSettings";

export interface PdfCustomer {
  name?: string | null;
  phone?: string | null;
  address?: string | null;
}

export interface PdfSeller {
  name: string;
  phone?: string | null;
  isManager: boolean;
}

const PRIMARY = "#1565C0";
const DARK = "#000000";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
}

function fmtMoney(n: number): string {
  return n.toLocaleString("uz-UZ") + " UZS";
}

function getPayStr(sale: SaleWithItems): string {
  if (sale.paymentType === "card") return "Plastik karta orqali";
  if (sale.paymentType === "transfer") return "Pul o'tkazmasi";
  return "Naqd to'lov";
}

function getHolatHtml(sale: SaleWithItems): string {
  const debt = sale.debtAmount ?? 0;
  if (debt > 0) {
    const text = sale.paymentType === "card" ? "⚠ Qisman nasiya" : "⚠ Qisman qarz";
    return `<span class="status-chip" style="background:#FEE2E2;color:#991B1B">${text}</span>`;
  }
  return `<span class="status-chip">✓ To'langan</span>`;
}

function getHolatText(sale: SaleWithItems): string {
  const debt = sale.debtAmount ?? 0;
  if (debt > 0) return sale.paymentType === "card" ? "⚠ Qisman nasiya" : "⚠ Qarz";
  return "✓ To'langan";
}

function baseStyles(settings?: StoreSettings): string {
  const scale = (settings?.printFontSizePercent ?? 100) / 100;
  const sz = (px: number) => `${(px * scale).toFixed(1)}px`;

  return `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; font-weight: 700; }
    @page {
      margin: 0;
    }
    body {
      font-family: 'Inter', Arial, sans-serif;
      font-size: ${sz(18)};
      font-weight: 700;
      color: ${DARK};
      background: #fff;
      padding: 1.5cm !important;
      margin: 0 !important;
      box-sizing: border-box;
    }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
    .store-name { font-size: ${sz(27)}; font-weight: 700; color: ${PRIMARY}; letter-spacing: -0.5px; }
    .store-sub { font-size: ${sz(16.5)}; color: #000000; margin-top: 2px; }
    .doc-title-block { text-align: right; }
    .doc-title { font-size: ${sz(24)}; font-weight: 700; color: ${DARK}; }
    .doc-num { font-size: ${sz(16.5)}; color: #000000; margin-top: 2px; }
    .divider { border: none; border-top: 3px solid ${PRIMARY}; margin: 7px 0; }
    .divider-thin { border: none; border-top: 1.5px solid #CBD5E1; margin: 5px 0; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; margin-bottom: 10px; }
    .meta-box { background: #F8FAFC; border-radius: 7px; padding: 8px 12px; border: 1px solid #CBD5E1; }
    .meta-label { font-size: ${sz(13.5)}; font-weight: 700; color: #000000; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
    .meta-val { font-size: ${sz(18)}; font-weight: 700; color: ${DARK}; }
    .meta-sub { font-size: ${sz(15)}; color: #000000; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-top: 4px; }
    thead tr { background: ${PRIMARY}; }
    thead th {
      color: #fff;
      font-size: ${sz(15)};
      font-weight: 700;
      text-align: left;
      padding: 8px 10px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      border: 1px solid rgba(255,255,255,0.15);
    }
    thead th:last-child { text-align: right; }
    tbody tr:nth-child(even) { background: #F8FAFC; }
    tbody tr:nth-child(odd) { background: #fff; }
    tbody td { padding: 8px 10px; font-size: ${sz(18)}; vertical-align: middle; border: 1px solid #CBD5E1; }
    tbody td:last-child { text-align: right; font-weight: 700; color: ${PRIMARY}; }
    .qty-cell { text-align: center !important; color: #000000 !important; font-weight: 700 !important; }
    .price-cell { text-align: right !important; color: #000000 !important; }
    .total-section { margin-top: 8px; }
    .total-row { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; }
    .total-row.grand { background: ${PRIMARY}; color: #fff; border-radius: 8px; padding: 12px 18px; margin-top: 5px; }
    .total-label { font-size: ${sz(18)}; }
    .total-val { font-size: ${sz(19.5)}; font-weight: 700; }
    .total-row.grand .total-label, .total-row.grand .total-val { color: #fff; font-size: ${sz(21)}; }
    .footer {
      margin-top: 16px;
      text-align: center;
      padding: 9px 0 0;
      border-top: 1.5px dashed #CBD5E1;
    }
    .footer-thanks { font-size: ${sz(20)}; font-weight: 700; color: ${PRIMARY}; letter-spacing: 0.2px; }
    .footer-sub { font-size: ${sz(15)}; color: #000000; margin-top: 3px; }
    .badge {
      display: inline-block;
      background: #EEF2FF;
      color: ${PRIMARY};
      font-size: ${sz(15)};
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 4px;
      margin-right: 3px;
    }
    .sign-row { display: flex; justify-content: space-between; margin-top: 14px; gap: 20px; }
    .sign-box { flex: 1; }
    .sign-label { font-size: ${sz(16.5)}; color: #000000; margin-bottom: 24px; }
    .sign-line { border-bottom: 1.5px solid #CBD5E1; padding-top: 2px; }
    .sign-name { font-size: ${sz(15)}; color: #000000; margin-top: 3px; }
    .waybill-info { background: #EFF6FF; border: 1.5px solid #BFDBFE; border-radius: 7px; padding: 9px 11px; margin-bottom: 10px; }
    .waybill-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: ${sz(16.5)}; }
    .waybill-key { color: #000000; font-weight: 700; }
    .waybill-val { color: ${DARK}; font-weight: 700; }
    .status-chip { display: inline-block; background: #D1FAE5; color: #065F46; border-radius: 5px; padding: 3px 9px; font-size: ${sz(15)}; font-weight: 700; }
    .customer-box { background: #F0F9FF; border: 1.5px solid #BAE6FD; border-radius: 7px; padding: 7px 10px; margin-bottom: 9px; }
    .customer-title { font-size: ${sz(15)}; font-weight: 700; color: #0284C7; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
    .customer-row { display: flex; gap: 6px; font-size: ${sz(16.5)}; padding: 2px 0; }
    .customer-key { color: #000000; min-width: 90px; }
    .customer-val { color: ${DARK}; font-weight: 700; }
    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      body { padding: 10px; }
      .no-print { display: none !important; }
    }
  `;
}

function sellerBlock(seller?: PdfSeller | null): string {
  if (!seller) {
    return `<div style="margin-top:4px"><div class="store-sub" style="color:#DC2626">Sotuvchi: —</div></div>`;
  }
  const label = seller.isManager ? `${seller.name} ★` : seller.name;
  return `
    <div style="margin-top:4px">
      <div class="store-sub"><strong>Sotuvchi: ${label}</strong></div>
      ${seller.phone ? `<div class="store-sub">Tel: ${seller.phone}</div>` : ""}
    </div>`;
}

function sellerLabel(seller?: PdfSeller | null): string {
  if (!seller) return "________________________";
  return seller.isManager ? `${seller.name} ★` : seller.name;
}

function customerBlock(customer?: PdfCustomer | null): string {
  if (!customer || (!customer.name && !customer.phone && !customer.address)) {
    return `
    <div class="customer-box">
      <div class="customer-title">📋 Xaridor ma'lumotlari</div>
      <div class="customer-row"><span class="customer-key">Haridor ismi:</span><span class="customer-val" style="color:#000000;font-weight:400;letter-spacing:1px">_______________________________</span></div>
      <div class="customer-row"><span class="customer-key">Telefon:</span><span class="customer-val" style="color:#000000;font-weight:400">__________________</span></div>
    </div>`;
  }
  return `
    <div class="customer-box">
      <div class="customer-title">📋 Xaridor ma'lumotlari</div>
      <div class="customer-row"><span class="customer-key">Haridor ismi:</span><span class="customer-val">${customer.name ?? "_______________________________"}</span></div>
      ${customer.phone ? `<div class="customer-row"><span class="customer-key">Telefon:</span><span class="customer-val">${customer.phone}</span></div>` : ""}
      ${customer.address ? `<div class="customer-row"><span class="customer-key">Manzil:</span><span class="customer-val">${customer.address}</span></div>` : ""}
    </div>`;
}

// ── Invoice (Hisob-faktura) — A4 Portrait ────────────────────────────────────
export function buildInvoiceHtml(
  sale: SaleWithItems,
  settings: StoreSettings = DEFAULT_SETTINGS,
  customer?: PdfCustomer | null,
  seller?: PdfSeller | null
): string {
  const paidAmt = sale.paidAmount ?? sale.totalAmount;
  const debtAmt = sale.debtAmount ?? 0;
  const scale = (settings.printFontSizePercent ?? 100) / 100;

  const rows = sale.items
    .map(
      (item, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>
          <strong>${item.productName}</strong><br/>
          <span style="color:#000000;font-size:${15 * scale}px">${item.brand}</span>
        </td>
        <td class="qty-cell">${item.quantity} ${item.unit ?? ""}</td>
        <td class="price-cell">${fmtMoney(item.unitPrice)}</td>
        <td>${fmtMoney(item.totalPrice)}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Hisob-faktura #${sale.id}</title>
  <style>${baseStyles(settings)}</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="store-name">${settings.storeName}</div>
      <div class="store-sub">${settings.storeSubtitle}</div>
      ${settings.storeAddress ? `<div class="store-sub">📍 ${settings.storeAddress}</div>` : ""}
      ${sellerBlock(seller)}
    </div>
    <div class="doc-title-block">
      <div class="doc-title">HISOB-FAKTURA</div>
      <div class="doc-num">№ INV-${String(sale.id).padStart(5, "0")}</div>
      <div class="doc-num" style="margin-top:4px">${fmtDate(sale.createdAt)} · ${fmtTime(sale.createdAt)}</div>
    </div>
  </div>

  <hr class="divider"/>

  ${customerBlock(customer)}

  <div class="meta-grid">
    <div class="meta-box">
      <div class="meta-label">Hujjat raqami</div>
      <div class="meta-val">INV-${String(sale.id).padStart(5, "0")}</div>
    </div>
    <div class="meta-box">
      <div class="meta-label">To'lov turi</div>
      <div class="meta-val">${getPayStr(sale)}</div>
    </div>
    <div class="meta-box">
      <div class="meta-label">Sana va vaqt</div>
      <div class="meta-val">${fmtDate(sale.createdAt)} ${fmtTime(sale.createdAt)}</div>
    </div>
    <div class="meta-box">
      <div class="meta-label">Holat</div>
      <div class="meta-val">${getHolatHtml(sale)}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:36px">#</th>
        <th>Mahsulot nomi</th>
        <th style="width:70px;text-align:center">Miqdori</th>
        <th style="width:130px;text-align:right">Birlik narxi</th>
        <th style="width:130px">Jami</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="total-section">
    <hr class="divider-thin"/>
    <div class="total-row">
      <span class="total-label" style="color:#000000">Mahsulotlar soni:</span>
      <span class="total-val" style="color:#000000">${sale.itemCount} dona</span>
    </div>
    ${sale.note ? `<div class="total-row"><span class="total-label" style="color:#000000">Izoh:</span><span class="total-val" style="color:#000000">${sale.note}</span></div>` : ""}
    ${sale.discountAmount && sale.discountAmount > 0 ? `
    <div class="total-row">
      <span class="total-label" style="color:#000000">Mahsulotlar jami:</span>
      <span class="total-val" style="color:#000000">${fmtMoney(sale.items.reduce((sum, item) => sum + item.totalPrice, 0))}</span>
    </div>
    <div class="total-row">
      <span class="total-label" style="color:#000000">Chegirma:</span>
      <span class="total-val" style="color:#000000">-${fmtMoney(sale.discountAmount)}</span>
    </div>
    ` : ""}
    <div class="total-row grand">
      <span class="total-label">UMUMIY SUMMA:</span>
      <span class="total-val">${fmtMoney(sale.totalAmount)}</span>
    </div>
    ${debtAmt > 0 ? `
    <div class="total-row" style="margin-top:6px">
      <span class="total-label" style="color:#000000;font-weight:600">To'langan:</span>
      <span class="total-val" style="color:#000000">${fmtMoney(paidAmt)}</span>
    </div>
    <div class="total-row">
      <span class="total-label" style="color:#000000;font-weight:700">Qarz summasi:</span>
      <span class="total-val" style="color:#000000;font-weight:700">${fmtMoney(debtAmt)}</span>
    </div>
    ` : ""}
  </div>

  <div class="sign-row">
    <div class="sign-box">
      <div class="sign-label">Sotuvchi: ${sellerLabel(seller)}</div>
      <div class="sign-line"></div>
      <div class="sign-name">F.I.Sh / Imzo</div>
    </div>
    <div class="sign-box">
      <div class="sign-label">Haridor ismi: ${customer?.name ?? "_______________________________"}</div>
      <div class="sign-line"></div>
      <div class="sign-name">F.I.Sh / Imzo</div>
    </div>
  </div>

  <div class="footer">
    <div class="footer-thanks">Xaridingiz uchun tashakkur!</div>
    <div class="footer-sub">${settings.storeName} · ${settings.storeSubtitle}</div>
  </div>
</body>
</html>`;
}

// ── Sales Receipt (Savdo cheki) ───────────────────────────────────────────────
export function buildReceiptHtml(
  sale: SaleWithItems,
  settings: StoreSettings = DEFAULT_SETTINGS,
  customer?: PdfCustomer | null,
  seller?: PdfSeller | null
): string {
  const paidAmt = sale.paidAmount ?? sale.totalAmount;
  const debtAmt = sale.debtAmount ?? 0;
  const scale = (settings.printFontSizePercent ?? 100) / 100;
  const sz = (px: number) => `${(px * scale).toFixed(1)}px`;

  const rows = sale.items
    .map(
      (item, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>
          <strong>${item.productName}</strong><br/>
          <span style="color:#000000;font-size:${sz(16.5)}">${item.brand}</span>
        </td>
        <td class="qty-cell">${item.quantity} ${item.unit ?? ""}</td>
        <td class="price-cell">${fmtMoney(item.unitPrice)}</td>
        <td>${fmtMoney(item.totalPrice)}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Savdo cheki #${sale.id}</title>
  <style>
    ${baseStyles(settings)}
    body { max-width: 630px; padding: 20px 26px; }
    .receipt-header { text-align: center; margin-bottom: 12px; }
    .receipt-logo { font-size: ${sz(27)}; font-weight: 700; color: ${PRIMARY}; }
    .receipt-sub { font-size: ${sz(16.5)}; color: #000000; margin-top: 2px; }
    .receipt-title { font-size: ${sz(19.5)}; font-weight: 700; margin-top: 8px; letter-spacing: 2px; color: ${DARK}; }
    .receipt-meta { display: flex; justify-content: space-between; font-size: ${sz(18)}; margin: 8px 0; color: #000000; }
    .receipt-meta span { color: #000000; margin-right: 4px; }
    .dashed { border-top: 1.5px dashed #CBD5E1; margin: 7px 0; }
  </style>
</head>
<body>
  <div class="receipt-header">
    <div class="receipt-logo">${settings.storeName}</div>
    <div class="receipt-sub">${settings.storeSubtitle}</div>
    ${settings.storeAddress ? `<div class="receipt-sub">📍 ${settings.storeAddress}</div>` : ""}
    <div class="receipt-sub"><strong>Sotuvchi: ${sellerLabel(seller)}</strong></div>
    <div class="receipt-title">— SAVDO CHEKI —</div>
  </div>

  <div class="receipt-meta">
    <div><span>Chek №:</span> RCP-${String(sale.id).padStart(5, "0")}</div>
    <div><span>Sana:</span> ${fmtDate(sale.createdAt)}</div>
  </div>
  <div class="receipt-meta">
    <div><span>Vaqt:</span> ${fmtTime(sale.createdAt)}</div>
    <div><span>To'lov turi:</span> ${getPayStr(sale)}</div>
  </div>

  ${customer && (customer.name || customer.phone) ? `
  <div class="dashed"></div>
  <div style="font-size:${sz(16.5)};color:#000000;margin-bottom:4px">XARIDOR:</div>
  ${customer.name ? `<div style="font-size:${sz(18)};font-weight:700;color:${DARK}">${customer.name}</div>` : ""}
  ${customer.phone ? `<div style="font-size:${sz(18)};color:#000000">📞 ${customer.phone}</div>` : ""}
  ${customer.address ? `<div style="font-size:${sz(18)};color:#000000">📍 ${customer.address}</div>` : ""}
  ` : ""}

  <div class="dashed"></div>

  <table>
    <thead>
      <tr>
        <th style="width:28px">#</th>
        <th>Mahsulot</th>
        <th style="width:40px;text-align:center">Dona</th>
        <th style="width:100px;text-align:right">Narx</th>
        <th style="width:100px">Jami</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="dashed" style="margin-top:14px"></div>

  <div class="total-section">
    ${sale.note ? `<div class="total-row"><span class="total-label" style="color:#000000;font-size:${sz(18)}">Izoh:</span><span style="font-size:${sz(18)};color:#000000">${sale.note}</span></div>` : ""}
    ${sale.discountAmount && sale.discountAmount > 0 ? `
    <div class="total-row" style="margin-top:6px">
      <span class="total-label" style="color:#000000;font-size:${sz(18)}">Mahsulotlar jami:</span>
      <span class="total-val" style="color:#000000;font-size:${sz(18)}">${fmtMoney(sale.items.reduce((sum, item) => sum + item.totalPrice, 0))}</span>
    </div>
    <div class="total-row">
      <span class="total-label" style="color:#000000;font-size:${sz(18)}">Chegirma:</span>
      <span class="total-val" style="color:#000000;font-size:${sz(18)}">-${fmtMoney(sale.discountAmount)}</span>
    </div>
    ` : ""}
    <div class="total-row grand" style="margin-top:12px">
      <span class="total-label">UMUMIY SUMMA:</span>
      <span class="total-val">${fmtMoney(sale.totalAmount)}</span>
    </div>
    ${debtAmt > 0 ? `
    <div class="total-row" style="margin-top:8px">
      <span class="total-label" style="color:#000000;font-weight:600">To'langan:</span>
      <span class="total-val" style="color:#000000">${fmtMoney(paidAmt)}</span>
    </div>
    <div class="total-row">
      <span class="total-label" style="color:#000000;font-weight:700">Qarz summasi:</span>
      <span class="total-val" style="color:#000000;font-weight:700">${fmtMoney(debtAmt)}</span>
    </div>
    ` : ""}
  </div>

  <div class="sign-row" style="margin-top:14px">
    <div class="sign-box">
      <div class="sign-label" style="font-size:${sz(16.5)};color:#000000;margin-bottom:24px">Sotuvchi: ${sellerLabel(seller)}</div>
      <div class="sign-line"></div>
      <div class="sign-name">F.I.Sh / Imzo</div>
    </div>
    <div class="sign-box">
      <div class="sign-label" style="font-size:${sz(16.5)};color:#000000;margin-bottom:24px">Haridor ismi: ${customer?.name ?? "_______________________________"}</div>
      <div class="sign-line"></div>
      <div class="sign-name">F.I.Sh / Imzo</div>
    </div>
  </div>

  <div class="footer" style="margin-top:28px">
    <div class="footer-thanks">Xaridingiz uchun tashakkur!</div>
    <div class="footer-sub">${settings.storeName} — ${fmtDate(sale.createdAt)}</div>
  </div>
</body>
</html>`;
}

// ── A5 Landscape Invoice (Qisqa faktura) ─────────────────────────────────────
export function buildA5InvoiceHtml(
  sale: SaleWithItems,
  settings: StoreSettings = DEFAULT_SETTINGS,
  customer?: PdfCustomer | null,
  seller?: PdfSeller | null
): string {
  const scale = (settings.printFontSizePercent ?? 100) / 100;
  const sz = (px: number) => `${(px * scale).toFixed(1)}px`;

  const rows = sale.items
    .map(
      (item, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${item.productName}</strong><span class="brand">${item.brand}</span></td>
        <td class="c">${item.quantity} ${item.unit ?? ""}</td>
        <td class="r">${fmtMoney(item.unitPrice)}</td>
        <td class="r bold">${fmtMoney(item.totalPrice)}</td>
      </tr>`
    )
    .join("");

  const paidAmt = sale.paidAmount ?? sale.totalAmount;
  const debtAmt = sale.debtAmount ?? 0;

  return `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8"/>
  <title>Faktura #${sale.id}</title>
  <style>
    @page { size: A5 landscape; margin: 10mm 12mm; }
    * { margin:0; padding:0; box-sizing:border-box; font-weight:700; }
    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
    body { font-family: Arial, sans-serif; font-size: ${sz(18)}; color: #000000; background:#fff; font-weight:700; }
    .top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; }
    .store-name { font-size:${sz(24)}; font-weight:700; color:${PRIMARY}; }
    .store-sub { font-size:${sz(15)}; color:#000000; margin-top:2px; }
    .doc-num { font-size:${sz(19.5)}; font-weight:700; text-align:right; }
    .doc-meta { font-size:${sz(15)}; color:#000000; text-align:right; margin-top:2px; }
    hr.div { border:none; border-top:2px solid ${PRIMARY}; margin:7px 0; }
    .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:9px; }
    .info-box { background:#F8FAFC; border-radius:5px; padding:8px 12px; border:1px solid #CBD5E1; }
    .info-label { font-size:${sz(13.5)}; font-weight:700; color:#000000; text-transform:uppercase; letter-spacing:0.4px; margin-bottom:2px; }
    .info-val { font-size:${sz(16.5)}; font-weight:700; color:#000000; }
    table { width:100%; border-collapse:collapse; font-size:${sz(16.5)}; }
    thead tr { background:${PRIMARY}; }
    thead th { color:#fff; padding:7px 10px; text-align:left; font-size:${sz(15)}; font-weight:700; text-transform:uppercase; }
    thead th.r { text-align:right; }
    tbody tr:nth-child(even) { background:#F8FAFC; }
    tbody td { padding:7px 10px; border-bottom:1px solid #CBD5E1; vertical-align:middle; }
    .brand { display:block; font-size:${sz(15)}; color:#000000; }
    td.c { text-align:center; }
    td.r { text-align:right; }
    td.bold { font-weight:700; color:${PRIMARY}; }
    .totals { margin-top:7px; display:flex; flex-direction:column; align-items:flex-end; }
    .grand-row { background:${PRIMARY}; color:#fff; border-radius:6px; padding:8px 16px; margin-top:4px; display:flex; justify-content:space-between; align-items:center; min-width:390px; }
    .grand-label { font-size:${sz(18)}; font-weight:700; }
    .grand-val { font-size:${sz(19.5)}; font-weight:700; }
    .footer { margin-top:10px; display:flex; justify-content:space-between; align-items:flex-end; border-top:1px dashed #CBD5E1; padding-top:7px; }
    .sign-box { flex:1; }
    .sign-label { font-size:${sz(15)}; color:#000000; margin-bottom:20px; }
    .sign-line { border-bottom:1px solid #CBD5E1; }
    .sign-name { font-size:${sz(13.5)}; color:#000000; margin-top:2px; }
    .thanks { text-align:center; font-size:${sz(16.5)}; font-weight:700; color:${PRIMARY}; }
  </style>
</head>
<body>
  <div class="top">
    <div>
      <div class="store-name">${settings.storeName}</div>
      <div class="store-sub">${settings.storeSubtitle}</div>
      ${settings.storeAddress ? `<div class="store-sub">📍 ${settings.storeAddress}</div>` : ""}
      <div class="store-sub"><strong>Sotuvchi: ${sellerLabel(seller)}</strong></div>
    </div>
    <div>
      <div class="doc-num">FAKTURA № INV-${String(sale.id).padStart(5, "0")}</div>
      <div class="doc-meta">${fmtDate(sale.createdAt)} · ${fmtTime(sale.createdAt)}</div>
    </div>
  </div>
  <hr class="div"/>
  <div class="info-grid">
    <div class="info-box">
      <div class="info-label">Xaridor</div>
      <div class="info-val">${customer?.name ?? "——"}</div>
      ${customer?.phone ? `<div style="font-size:${sz(15)};color:#000000">📞 ${customer.phone}</div>` : ""}
    </div>
    <div class="info-box">
      <div class="info-label">To'lov turi</div>
      <div class="info-val">${getPayStr(sale)}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Mahsulotlar soni</div>
      <div class="info-val">${sale.itemCount} dona (${sale.items.length} xil)</div>
    </div>
    <div class="info-box">
      <div class="info-label">Holat</div>
      <div class="info-val" style="color:#000000">
        ${getHolatText(sale)}
      </div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:26px">#</th>
        <th>Mahsulot</th>
        <th style="width:46px" class="r">Dona</th>
        <th style="width:110px" class="r">Birlik narxi</th>
        <th style="width:120px" class="r">Jami</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals">
    ${sale.note ? `<div style="font-size:${sz(11)};color:#000000;margin-bottom:3px">Izoh: ${sale.note}</div>` : ""}
    ${sale.discountAmount && sale.discountAmount > 0 ? `
    <div style="display:flex;justify-content:space-between;min-width:260px;margin-bottom:3px;padding:2px 4px">
      <span style="font-size:${sz(12)};color:#000000">Mahsulotlar jami:</span>
      <span style="font-size:${sz(12)};color:#000000">${fmtMoney(sale.items.reduce((sum, item) => sum + item.totalPrice, 0))}</span>
    </div>
    <div style="display:flex;justify-content:space-between;min-width:260px;margin-bottom:3px;padding:2px 4px">
      <span style="font-size:${sz(12)};color:#000000">Chegirma:</span>
      <span style="font-size:${sz(12)};color:#000000">-${fmtMoney(sale.discountAmount)}</span>
    </div>
    ` : ""}
    <div class="grand-row">
      <span class="grand-label">UMUMIY SUMMA</span>
      <span class="grand-val">${fmtMoney(sale.totalAmount)}</span>
    </div>
    ${debtAmt > 0 ? `
    <div style="display:flex;justify-content:space-between;min-width:260px;margin-top:6px;padding:2px 4px">
      <span style="font-size:${sz(12)};color:#000000;font-weight:600">To'langan:</span>
      <span style="font-size:${sz(13)};color:#000000;font-weight:600">${fmtMoney(paidAmt)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;min-width:260px;margin-top:2px;padding:2px 4px">
      <span style="font-size:${sz(12)};color:#000000;font-weight:700">Qarz summasi:</span>
      <span style="font-size:${sz(13)};color:#000000;font-weight:700">${fmtMoney(debtAmt)}</span>
    </div>
    ` : ""}
  </div>
  <div class="footer">
    <div class="sign-box" style="max-width:44%">
      <div class="sign-label">Sotuvchi: ${sellerLabel(seller)}</div>
      <div class="sign-line"></div>
      <div class="sign-name">F.I.Sh / Imzo</div>
    </div>
    <div class="thanks">Xaridingiz uchun<br/>tashakkur!</div>
    <div class="sign-box" style="max-width:44%;text-align:right">
      <div class="sign-label" style="text-align:right">Haridor ismi: ${customer?.name ?? "_______________________________"}</div>
      <div class="sign-line"></div>
      <div class="sign-name" style="text-align:right">F.I.Sh / Imzo</div>
    </div>
  </div>
</body>
</html>`;
}

// ── Thermal Receipt (Termal chek, 80mm) ───────────────────────────────────────
export function buildThermalHtml(
  sale: SaleWithItems,
  settings: StoreSettings = DEFAULT_SETTINGS,
  customer?: PdfCustomer | null,
  seller?: PdfSeller | null
): string {
  const scale = (settings.printFontSizePercent ?? 100) / 100;
  const sz = (px: number) => `${(px * scale).toFixed(1)}px`;

  const rows = sale.items
    .map(
      (item, i) => `
    <div class="item">
      <div class="item-name">${i + 1}. ${item.productName} <span class="brand">(${item.brand})</span></div>
      <div class="item-row">
        <span>${item.quantity} ${item.unit ?? ""} × ${item.unitPrice.toLocaleString("uz-UZ")}</span>
        <span class="item-total">${item.totalPrice.toLocaleString("uz-UZ")} UZS</span>
      </div>
    </div>`
    )
    .join("");

  const paidAmt = sale.paidAmount ?? sale.totalAmount;
  const debtAmt = sale.debtAmount ?? 0;

  return `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8"/>
  <title>Chek #${sale.id}</title>
  <style>
    @page { size: 80mm auto; margin: 3mm 2mm; }
    * { margin:0; padding:0; box-sizing:border-box; font-weight: bold; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: ${sz(12)};
      font-weight: bold;
      color: #000;
      background: #fff;
      width: 74mm;
      max-width: 74mm;
    }
    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
    .center { text-align:center; }
    .logo { font-size:${sz(15)}; font-weight:bold; letter-spacing:1px; }
    .sub { font-size:${sz(10)}; color:#000; margin-top:2px; }
    .dash { border:none; border-top:1px dashed #000; margin:5px 0; }
    .title { font-size:${sz(12)}; font-weight:bold; letter-spacing:3px; margin:5px 0 2px; }
    .row { display:flex; justify-content:space-between; font-size:${sz(10)}; margin:2px 0; }
    .lbl { color:#000; }
    .item { margin:3px 0; }
    .item-name { font-size:${sz(11)}; font-weight:bold; word-break:break-word; }
    .brand { font-weight:bold; font-size:${sz(10)}; color:#000; }
    .item-row { display:flex; justify-content:space-between; font-size:${sz(11)}; padding-left:6px; margin-top:1px; }
    .item-total { font-weight:bold; }
    .t-row { display:flex; justify-content:space-between; font-size:${sz(11)}; padding:1px 0; }
    .grand { font-size:${sz(14)}; font-weight:bold; border-top:2px solid #000; padding-top:3px; margin-top:3px; }
    .thanks { font-size:${sz(12)}; font-weight:bold; text-align:center; margin-top:6px; }
    .footer { text-align:center; font-size:${sz(10)}; color:#000; margin-top:3px; }
  </style>
</head>
<body>
  <div class="center">
    <div class="logo">${settings.storeName}</div>
    <div class="sub">${settings.storeSubtitle}</div>
    ${settings.storeAddress ? `<div class="sub">📍 ${settings.storeAddress}</div>` : ""}
    <div class="sub"><strong>Sotuvchi: ${sellerLabel(seller)}</strong></div>
    <div class="title">— SAVDO CHEKI —</div>
  </div>
  <hr class="dash"/>
  <div class="row"><span class="lbl">Chek №:</span><span>RCP-${String(sale.id).padStart(5, "0")}</span></div>
  <div class="row"><span class="lbl">Sana:</span><span>${fmtDate(sale.createdAt)}</span></div>
  <div class="row"><span class="lbl">Vaqt:</span><span>${fmtTime(sale.createdAt)}</span></div>
  <div class="row"><span class="lbl">To'lov:</span><span>${getPayStr(sale)}</span></div>
  ${customer?.name ? `
  <hr class="dash"/>
  <div class="row"><span class="lbl">Xaridor:</span><span>${customer.name}</span></div>
  ${customer.phone ? `<div class="row"><span class="lbl">Tel:</span><span>${customer.phone}</span></div>` : ""}
  ` : ""}
  <hr class="dash"/>
  ${rows}
  <hr class="dash"/>
  <div class="t-row"><span>Mahsulotlar:</span><span>${sale.itemCount} dona</span></div>
  ${sale.note ? `<div class="t-row"><span>Izoh:</span><span>${sale.note}</span></div>` : ""}
  <div class="t-row grand">
    <span>JAMI:</span>
    <span>${sale.totalAmount.toLocaleString("uz-UZ")} UZS</span>
  </div>
  ${debtAmt > 0 ? `
  <div class="t-row"><span style="color:#000;font-weight:bold">To'langan:</span><span style="color:#000;font-weight:bold">${paidAmt.toLocaleString("uz-UZ")} UZS</span></div>
  <div class="t-row"><span style="color:#000;font-weight:bold;font-size:${sz(12)}">Qarz summasi:</span><span style="color:#000;font-weight:bold;font-size:${sz(12)}">${debtAmt.toLocaleString("uz-UZ")} UZS</span></div>
  ` : ""}
  <hr class="dash"/>
  <div class="thanks">Xaridingiz uchun tashakkur!</div>
  <div class="footer">${settings.storeName} · ${fmtDate(sale.createdAt)}</div>
  <br/><br/>
</body>
</html>`;
}

// ── Waybill (Yuk xati) ────────────────────────────────────────────────────────
export function buildWaybillHtml(
  sale: SaleWithItems,
  settings: StoreSettings = DEFAULT_SETTINGS,
  customer?: PdfCustomer | null,
  seller?: PdfSeller | null
): string {
  const paidAmt = sale.paidAmount ?? sale.totalAmount;
  const debtAmt = sale.debtAmount ?? 0;
  const scale = (settings.printFontSizePercent ?? 100) / 100;

  const rows = sale.items
    .map(
      (item, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>
          <strong>${item.productName}</strong><br/>
          <span style="color:#000000;font-size:${16.5 * scale}px">${item.brand}</span>
        </td>
        <td class="qty-cell">${item.quantity} ${item.unit ?? ""}</td>
        <td class="price-cell">${fmtMoney(item.unitPrice)}</td>
        <td>${fmtMoney(item.totalPrice)}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Yuk xati #${sale.id}</title>
  <style>${baseStyles(settings)}</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="store-name">${settings.storeName}</div>
      <div class="store-sub">${settings.storeSubtitle}</div>
      ${settings.storeAddress ? `<div class="store-sub">📍 ${settings.storeAddress}</div>` : ""}
      ${sellerBlock(seller)}
    </div>
    <div class="doc-title-block">
      <div class="doc-title">YUK XATI</div>
      <div class="doc-num">№ WB-${String(sale.id).padStart(5, "0")}</div>
      <div class="doc-num" style="margin-top:4px">${fmtDate(sale.createdAt)} · ${fmtTime(sale.createdAt)}</div>
    </div>
  </div>

  <hr class="divider"/>

  <div class="waybill-info">
    <div class="waybill-row">
      <span class="waybill-key">Yuk xati raqami:</span>
      <span class="waybill-val">WB-${String(sale.id).padStart(5, "0")}</span>
    </div>
    <div class="waybill-row">
      <span class="waybill-key">Jo'natma sanasi:</span>
      <span class="waybill-val">${fmtDate(sale.createdAt)}</span>
    </div>
    <div class="waybill-row">
      <span class="waybill-key">Jo'natma vaqti:</span>
      <span class="waybill-val">${fmtTime(sale.createdAt)}</span>
    </div>
    <div class="waybill-row">
      <span class="waybill-key">Umumiy mahsulot:</span>
      <span class="waybill-val">${sale.itemCount} dona</span>
    </div>
    <div class="waybill-row">
      <span class="waybill-key">To'lov turi:</span>
      <span class="waybill-val">${getPayStr(sale)}</span>
    </div>
    <div class="waybill-row">
      <span class="waybill-key">Holat:</span>
      <span class="waybill-val">
        ${getHolatHtml(sale)}
      </span>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-box">
      <div class="meta-label">Jo'natuvchi (Sotuvchi)</div>
      <div class="meta-val">${settings.storeName}</div>
      ${seller ? `
        <div class="meta-sub"><strong>${sellerLabel(seller)}</strong></div>
        ${seller.phone ? `<div class="meta-sub">📞 ${seller.phone}</div>` : ""}
      ` : ""}
      ${settings.storeAddress ? `<div class="meta-sub">📍 ${settings.storeAddress}</div>` : ""}
    </div>
    <div class="meta-box">
      <div class="meta-label">Qabul qiluvchi (Xaridor)</div>
      <div class="meta-val">${customer?.name ?? "_______________________________"}</div>
      ${customer?.phone ? `<div class="meta-sub">📞 ${customer.phone}</div>` : `<div class="meta-sub" style="color:#000000">Tel: ___________________</div>`}
      ${customer?.address ? `<div class="meta-sub">📍 ${customer.address}</div>` : `<div class="meta-sub" style="color:#000000">Manzil: ________________</div>`}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:36px">#</th>
        <th>Mahsulot nomi va brendi</th>
        <th style="width:80px;text-align:center">Miqdori</th>
        <th style="width:130px;text-align:right">Birlik narxi</th>
        <th style="width:130px">Jami qiymati</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="total-section">
    <hr class="divider-thin"/>
    <div class="total-row">
      <span class="total-label" style="color:#000000">Jami mahsulot turi:</span>
      <span class="total-val" style="color:#000000">${sale.items.length} xil</span>
    </div>
    <div class="total-row">
      <span class="total-label" style="color:#000000">Jami dona:</span>
      <span class="total-val" style="color:#000000">${sale.itemCount} dona</span>
    </div>
    ${sale.note ? `<div class="total-row"><span class="total-label" style="color:#000000">Izoh:</span><span class="total-val" style="color:#000000">${sale.note}</span></div>` : ""}
    ${sale.discountAmount && sale.discountAmount > 0 ? `
    <div class="total-row">
      <span class="total-label" style="color:#000000">Mahsulotlar jami:</span>
      <span class="total-val" style="color:#000000">${fmtMoney(sale.items.reduce((sum, item) => sum + item.totalPrice, 0))}</span>
    </div>
    <div class="total-row">
      <span class="total-label" style="color:#000000">Chegirma:</span>
      <span class="total-val" style="color:#000000">-${fmtMoney(sale.discountAmount)}</span>
    </div>
    ` : ""}
    <div class="total-row grand">
      <span class="total-label">UMUMIY SUMMA:</span>
      <span class="total-val">${fmtMoney(sale.totalAmount)}</span>
    </div>
    ${debtAmt > 0 ? `
    <div class="total-row" style="margin-top:6px">
      <span class="total-label" style="color:#000000;font-weight:600">To'langan:</span>
      <span class="total-val" style="color:#000000">${fmtMoney(paidAmt)}</span>
    </div>
    <div class="total-row">
      <span class="total-label" style="color:#000000;font-weight:700">Qarz summasi:</span>
      <span class="total-val" style="color:#000000;font-weight:700">${fmtMoney(debtAmt)}</span>
    </div>
    ` : ""}
  </div>

  <div class="sign-row">
    <div class="sign-box">
      <div class="sign-label">Jo'natuvchi: ${sellerLabel(seller)}</div>
      <div class="sign-line"></div>
      <div class="sign-name">F.I.Sh / Imzo / Muhr</div>
    </div>
    <div class="sign-box">
      <div class="sign-label">Haridor ismi: ${customer?.name ?? "_______________________________"}</div>
      <div class="sign-line"></div>
      <div class="sign-name">F.I.Sh / Imzo / Sana</div>
    </div>
  </div>

  <div class="footer">
    <div class="footer-thanks">Xaridingiz uchun tashakkur!</div>
    <div class="footer-sub">${settings.storeName} · Yuk xati № WB-${String(sale.id).padStart(5, "0")} · ${fmtDate(sale.createdAt)}</div>
  </div>
</body>
</html>`;
}
