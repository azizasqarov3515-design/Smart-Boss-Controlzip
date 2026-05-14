import type { SaleWithItems } from "@workspace/api-client-react";
import type { StoreSettings } from "@/hooks/useSettings";
import { DEFAULT_SETTINGS } from "@/hooks/useSettings";

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
const DARK = "#0D1117";

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

function baseStyles(): string {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', Arial, sans-serif;
      font-size: 11px;
      color: ${DARK};
      background: #fff;
      padding: 14px 18px;
      max-width: 700px;
      margin: 0 auto;
    }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
    .store-name { font-size: 18px; font-weight: 700; color: ${PRIMARY}; letter-spacing: -0.5px; }
    .store-sub { font-size: 10px; color: #6B7280; margin-top: 2px; }
    .doc-title-block { text-align: right; }
    .doc-title { font-size: 15px; font-weight: 700; color: ${DARK}; }
    .doc-num { font-size: 10px; color: #6B7280; margin-top: 2px; }
    .divider { border: none; border-top: 2px solid ${PRIMARY}; margin: 7px 0; }
    .divider-thin { border: none; border-top: 1px solid #E5E7EB; margin: 5px 0; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; margin-bottom: 10px; }
    .meta-box { background: #F8FAFC; border-radius: 7px; padding: 6px 9px; border: 1px solid #E5E7EB; }
    .meta-label { font-size: 8px; font-weight: 600; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
    .meta-val { font-size: 11px; font-weight: 600; color: ${DARK}; }
    .meta-sub { font-size: 9px; color: #6B7280; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-top: 4px; }
    thead tr { background: ${PRIMARY}; }
    thead th {
      color: #fff;
      font-size: 9px;
      font-weight: 600;
      text-align: left;
      padding: 6px 8px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      border: 1px solid rgba(255,255,255,0.15);
    }
    thead th:last-child { text-align: right; }
    tbody tr:nth-child(even) { background: #F8FAFC; }
    tbody tr:nth-child(odd) { background: #fff; }
    tbody td { padding: 5px 8px; font-size: 11px; vertical-align: middle; border: 1px solid #E5E7EB; }
    tbody td:last-child { text-align: right; font-weight: 600; color: ${PRIMARY}; }
    .qty-cell { text-align: center !important; color: #374151 !important; font-weight: 500 !important; }
    .price-cell { text-align: right !important; color: #374151 !important; }
    .total-section { margin-top: 8px; }
    .total-row { display: flex; justify-content: space-between; align-items: center; padding: 3px 0; }
    .total-row.grand { background: ${PRIMARY}; color: #fff; border-radius: 8px; padding: 9px 14px; margin-top: 5px; }
    .total-label { font-size: 11px; }
    .total-val { font-size: 12px; font-weight: 700; }
    .total-row.grand .total-label, .total-row.grand .total-val { color: #fff; font-size: 13px; }
    .footer {
      margin-top: 16px;
      text-align: center;
      padding: 9px 0 0;
      border-top: 1.5px dashed #CBD5E1;
    }
    .footer-thanks { font-size: 12px; font-weight: 700; color: ${PRIMARY}; letter-spacing: 0.2px; }
    .footer-sub { font-size: 9px; color: #9CA3AF; margin-top: 3px; }
    .badge {
      display: inline-block;
      background: #EEF2FF;
      color: ${PRIMARY};
      font-size: 9px;
      font-weight: 600;
      padding: 1px 5px;
      border-radius: 4px;
      margin-right: 3px;
    }
    .sign-row { display: flex; justify-content: space-between; margin-top: 14px; gap: 20px; }
    .sign-box { flex: 1; }
    .sign-label { font-size: 10px; color: #6B7280; margin-bottom: 16px; }
    .sign-line { border-bottom: 1.5px solid #D1D5DB; padding-top: 2px; }
    .sign-name { font-size: 9px; color: #9CA3AF; margin-top: 3px; }
    .waybill-info { background: #EFF6FF; border: 1.5px solid #BFDBFE; border-radius: 7px; padding: 9px 11px; margin-bottom: 10px; }
    .waybill-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 10px; }
    .waybill-key { color: #6B7280; font-weight: 500; }
    .waybill-val { color: ${DARK}; font-weight: 600; }
    .status-chip { display: inline-block; background: #D1FAE5; color: #065F46; border-radius: 5px; padding: 2px 7px; font-size: 9px; font-weight: 600; }
    .customer-box { background: #F0F9FF; border: 1.5px solid #BAE6FD; border-radius: 7px; padding: 7px 10px; margin-bottom: 9px; }
    .customer-title { font-size: 9px; font-weight: 600; color: #0369A1; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
    .customer-row { display: flex; gap: 6px; font-size: 10px; padding: 1px 0; }
    .customer-key { color: #6B7280; min-width: 65px; }
    .customer-val { color: ${DARK}; font-weight: 600; }
    @media print {
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
      <div class="customer-row"><span class="customer-key">Ism:</span><span class="customer-val" style="color:#D1D5DB;font-weight:400">________________________</span></div>
      <div class="customer-row"><span class="customer-key">Telefon:</span><span class="customer-val" style="color:#D1D5DB;font-weight:400">__________________</span></div>
    </div>`;
  }
  return `
    <div class="customer-box">
      <div class="customer-title">📋 Xaridor ma'lumotlari</div>
      ${customer.name ? `<div class="customer-row"><span class="customer-key">Ism:</span><span class="customer-val">${customer.name}</span></div>` : ""}
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
  const rows = sale.items
    .map(
      (item, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>
          <strong>${item.productName}</strong><br/>
          <span style="color:#6B7280;font-size:10px">${item.brand}</span>
        </td>
        <td class="qty-cell">${item.quantity}</td>
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
  <style>${baseStyles()}</style>
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
      <div class="meta-label">Sana</div>
      <div class="meta-val">${fmtDate(sale.createdAt)}</div>
    </div>
    <div class="meta-box">
      <div class="meta-label">Mahsulotlar soni</div>
      <div class="meta-val">${sale.itemCount} dona</div>
    </div>
    <div class="meta-box">
      <div class="meta-label">Holat</div>
      <div class="meta-val"><span class="status-chip">To'langan</span></div>
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
      <span class="total-label" style="color:#6B7280">Mahsulotlar soni:</span>
      <span class="total-val" style="color:#374151">${sale.itemCount} dona</span>
    </div>
    ${sale.note ? `<div class="total-row"><span class="total-label" style="color:#6B7280">Izoh:</span><span class="total-val" style="color:#374151">${sale.note}</span></div>` : ""}
    <div class="total-row grand">
      <span class="total-label">JAMI TO'LOV:</span>
      <span class="total-val">${fmtMoney(sale.totalAmount)}</span>
    </div>
  </div>

  <div class="sign-row">
    <div class="sign-box">
      <div class="sign-label">Sotuvchi: ${sellerLabel(seller)}</div>
      <div class="sign-line"></div>
      <div class="sign-name">F.I.Sh / Imzo</div>
    </div>
    <div class="sign-box">
      <div class="sign-label">Xaridor: ${customer?.name ?? "________________________"}</div>
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
  const rows = sale.items
    .map(
      (item, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>
          <strong>${item.productName}</strong><br/>
          <span style="color:#6B7280;font-size:11px">${item.brand}</span>
        </td>
        <td class="qty-cell">${item.quantity}</td>
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
    ${baseStyles()}
    body { max-width: 420px; padding: 14px 18px; }
    .receipt-header { text-align: center; margin-bottom: 12px; }
    .receipt-logo { font-size: 18px; font-weight: 700; color: ${PRIMARY}; }
    .receipt-sub { font-size: 10px; color: #6B7280; margin-top: 2px; }
    .receipt-title { font-size: 12px; font-weight: 700; margin-top: 8px; letter-spacing: 2px; color: ${DARK}; }
    .receipt-meta { display: flex; justify-content: space-between; font-size: 11px; margin: 8px 0; color: #374151; }
    .receipt-meta span { color: #6B7280; margin-right: 4px; }
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
    <div><span>Dona:</span> ${sale.itemCount}</div>
  </div>

  ${customer && (customer.name || customer.phone) ? `
  <div class="dashed"></div>
  <div style="font-size:11px;color:#6B7280;margin-bottom:4px">XARIDOR:</div>
  ${customer.name ? `<div style="font-size:12px;font-weight:600;color:${DARK}">${customer.name}</div>` : ""}
  ${customer.phone ? `<div style="font-size:12px;color:#374151">📞 ${customer.phone}</div>` : ""}
  ${customer.address ? `<div style="font-size:12px;color:#374151">📍 ${customer.address}</div>` : ""}
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
    ${sale.note ? `<div class="total-row"><span class="total-label" style="color:#6B7280;font-size:12px">Izoh:</span><span style="font-size:12px;color:#374151">${sale.note}</span></div>` : ""}
    <div class="total-row grand" style="margin-top:12px">
      <span class="total-label">JAMI:</span>
      <span class="total-val">${fmtMoney(sale.totalAmount)}</span>
    </div>
  </div>

  <div class="sign-row" style="margin-top:14px">
    <div class="sign-box">
      <div class="sign-label" style="font-size:10px;color:#6B7280;margin-bottom:16px">Sotuvchi: ${sellerLabel(seller)}</div>
      <div class="sign-line"></div>
      <div class="sign-name">F.I.Sh / Imzo</div>
    </div>
    <div class="sign-box">
      <div class="sign-label" style="font-size:10px;color:#6B7280;margin-bottom:16px">Xaridor: ${customer?.name ?? "________________________"}</div>
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
  const rows = sale.items
    .map(
      (item, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${item.productName}</strong><span class="brand">${item.brand}</span></td>
        <td class="c">${item.quantity}</td>
        <td class="r">${fmtMoney(item.unitPrice)}</td>
        <td class="r bold">${fmtMoney(item.totalPrice)}</td>
      </tr>`
    )
    .join("");

  const payLabel: Record<string, string> = { cash: "Naqd to'lov", card: "Karta orqali", debt: "Qarz (nasiya)" };

  return `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8"/>
  <title>Faktura #${sale.id}</title>
  <style>
    @page { size: A5 landscape; margin: 10mm 12mm; }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #0D1117; background:#fff; }
    .top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; }
    .store-name { font-size:15px; font-weight:700; color:${PRIMARY}; }
    .store-sub { font-size:9px; color:#6B7280; margin-top:2px; }
    .doc-num { font-size:12px; font-weight:700; text-align:right; }
    .doc-meta { font-size:9px; color:#6B7280; text-align:right; margin-top:2px; }
    hr.div { border:none; border-top:2px solid ${PRIMARY}; margin:7px 0; }
    .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:9px; }
    .info-box { background:#F8FAFC; border-radius:5px; padding:6px 8px; }
    .info-label { font-size:8px; font-weight:600; color:#9CA3AF; text-transform:uppercase; letter-spacing:0.4px; margin-bottom:2px; }
    .info-val { font-size:10px; font-weight:600; color:#0D1117; }
    table { width:100%; border-collapse:collapse; font-size:10px; }
    thead tr { background:${PRIMARY}; }
    thead th { color:#fff; padding:5px 7px; text-align:left; font-size:9px; font-weight:600; text-transform:uppercase; }
    thead th.r { text-align:right; }
    tbody tr:nth-child(even) { background:#F8FAFC; }
    tbody td { padding:5px 7px; border-bottom:1px solid #F1F5F9; vertical-align:middle; }
    .brand { display:block; font-size:9px; color:#6B7280; }
    td.c { text-align:center; }
    td.r { text-align:right; }
    td.bold { font-weight:600; color:${PRIMARY}; }
    .totals { margin-top:7px; display:flex; flex-direction:column; align-items:flex-end; }
    .grand-row { background:${PRIMARY}; color:#fff; border-radius:6px; padding:6px 12px; margin-top:4px; display:flex; justify-content:space-between; align-items:center; min-width:260px; }
    .grand-label { font-size:11px; font-weight:700; }
    .grand-val { font-size:12px; font-weight:700; }
    .footer { margin-top:10px; display:flex; justify-content:space-between; align-items:flex-end; border-top:1px dashed #CBD5E1; padding-top:7px; }
    .sign-box { flex:1; }
    .sign-label { font-size:9px; color:#6B7280; margin-bottom:14px; }
    .sign-line { border-bottom:1px solid #D1D5DB; }
    .sign-name { font-size:8px; color:#9CA3AF; margin-top:2px; }
    .thanks { text-align:center; font-size:10px; font-weight:700; color:${PRIMARY}; }
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
      ${customer?.phone ? `<div style="font-size:9px;color:#6B7280">📞 ${customer.phone}</div>` : ""}
    </div>
    <div class="info-box">
      <div class="info-label">To'lov turi</div>
      <div class="info-val">${payLabel[sale.paymentType ?? "cash"] ?? "Naqd to'lov"}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Mahsulotlar soni</div>
      <div class="info-val">${sale.itemCount} dona (${sale.items.length} xil)</div>
    </div>
    <div class="info-box">
      <div class="info-label">Holat</div>
      <div class="info-val" style="color:#059669">✓ To'langan</div>
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
    ${sale.note ? `<div style="font-size:10px;color:#6B7280;margin-bottom:3px">Izoh: ${sale.note}</div>` : ""}
    <div class="grand-row">
      <span class="grand-label">JAMI TO'LOV</span>
      <span class="grand-val">${fmtMoney(sale.totalAmount)}</span>
    </div>
  </div>
  <div class="footer">
    <div class="sign-box" style="max-width:44%">
      <div class="sign-label">Sotuvchi: ${sellerLabel(seller)}</div>
      <div class="sign-line"></div>
      <div class="sign-name">F.I.Sh / Imzo</div>
    </div>
    <div class="thanks">Xaridingiz uchun<br/>tashakkur!</div>
    <div class="sign-box" style="max-width:44%;text-align:right">
      <div class="sign-label" style="text-align:right">Xaridor: ${customer?.name ?? "________________________"}</div>
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
  const rows = sale.items
    .map(
      (item, i) => `
    <div class="item">
      <div class="item-name">${i + 1}. ${item.productName} <span class="brand">(${item.brand})</span></div>
      <div class="item-row">
        <span>${item.quantity} × ${item.unitPrice.toLocaleString("uz-UZ")}</span>
        <span class="item-total">${item.totalPrice.toLocaleString("uz-UZ")} UZS</span>
      </div>
    </div>`
    )
    .join("");

  const payLabel: Record<string, string> = { cash: "NAQD", card: "KARTA", debt: "QARZ" };
  const paidAmt = sale.paidAmount ?? sale.totalAmount;
  const debtAmt = sale.debtAmount ?? 0;

  return `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8"/>
  <title>Chek #${sale.id}</title>
  <style>
    @page { size: 80mm auto; margin: 3mm 2mm; }
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      color: #000;
      background: #fff;
      width: 74mm;
      max-width: 74mm;
    }
    .center { text-align:center; }
    .logo { font-size:14px; font-weight:bold; letter-spacing:1px; }
    .sub { font-size:9px; color:#333; margin-top:2px; }
    .dash { border:none; border-top:1px dashed #000; margin:5px 0; }
    .title { font-size:11px; font-weight:bold; letter-spacing:3px; margin:5px 0 2px; }
    .row { display:flex; justify-content:space-between; font-size:9px; margin:2px 0; }
    .lbl { color:#555; }
    .item { margin:3px 0; }
    .item-name { font-size:10px; font-weight:bold; word-break:break-word; }
    .brand { font-weight:normal; font-size:9px; color:#555; }
    .item-row { display:flex; justify-content:space-between; font-size:10px; padding-left:6px; margin-top:1px; }
    .item-total { font-weight:bold; }
    .t-row { display:flex; justify-content:space-between; font-size:10px; padding:1px 0; }
    .grand { font-size:13px; font-weight:bold; border-top:2px solid #000; padding-top:3px; margin-top:3px; }
    .thanks { font-size:11px; font-weight:bold; text-align:center; margin-top:6px; }
    .footer { text-align:center; font-size:9px; color:#555; margin-top:3px; }
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
  <div class="row"><span class="lbl">To'lov:</span><span>${payLabel[sale.paymentType ?? "cash"] ?? "NAQD"}</span></div>
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
  <div class="t-row"><span>To'langan:</span><span>${paidAmt.toLocaleString("uz-UZ")} UZS</span></div>
  <div class="t-row"><span>Qarz:</span><span>${debtAmt.toLocaleString("uz-UZ")} UZS</span></div>
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
  const rows = sale.items
    .map(
      (item, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>
          <strong>${item.productName}</strong><br/>
          <span style="color:#6B7280;font-size:10px">${item.brand}</span>
        </td>
        <td class="qty-cell">${item.quantity}</td>
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
  <style>${baseStyles()}</style>
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
      <span class="waybill-key">Holat:</span>
      <span class="waybill-val"><span class="status-chip">Topshirildi</span></span>
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
      <div class="meta-val">${customer?.name ?? "________________________"}</div>
      ${customer?.phone ? `<div class="meta-sub">📞 ${customer.phone}</div>` : `<div class="meta-sub" style="color:#D1D5DB">Tel: ___________________</div>`}
      ${customer?.address ? `<div class="meta-sub">📍 ${customer.address}</div>` : `<div class="meta-sub" style="color:#D1D5DB">Manzil: ________________</div>`}
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
      <span class="total-label" style="color:#6B7280">Jami mahsulot turi:</span>
      <span class="total-val" style="color:#374151">${sale.items.length} xil</span>
    </div>
    <div class="total-row">
      <span class="total-label" style="color:#6B7280">Jami dona:</span>
      <span class="total-val" style="color:#374151">${sale.itemCount} dona</span>
    </div>
    ${sale.note ? `<div class="total-row"><span class="total-label" style="color:#6B7280">Izoh:</span><span class="total-val" style="color:#374151">${sale.note}</span></div>` : ""}
    <div class="total-row grand">
      <span class="total-label">UMUMIY QIYMAT:</span>
      <span class="total-val">${fmtMoney(sale.totalAmount)}</span>
    </div>
  </div>

  <div class="sign-row">
    <div class="sign-box">
      <div class="sign-label">Jo'natuvchi: ${sellerLabel(seller)}</div>
      <div class="sign-line"></div>
      <div class="sign-name">F.I.Sh / Imzo / Muhr</div>
    </div>
    <div class="sign-box">
      <div class="sign-label">Qabul qiluvchi: ${customer?.name ?? "________________________"}</div>
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
