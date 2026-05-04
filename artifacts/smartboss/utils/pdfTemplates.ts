import type { SaleWithItems } from "@workspace/api-client-react";
import type { StoreSettings } from "@/hooks/useSettings";
import { DEFAULT_SETTINGS } from "@/hooks/useSettings";

export interface PdfCustomer {
  name?: string | null;
  phone?: string | null;
  address?: string | null;
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
      font-size: 13px;
      color: ${DARK};
      background: #fff;
      padding: 32px 36px;
      max-width: 700px;
      margin: 0 auto;
    }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; }
    .store-name { font-size: 22px; font-weight: 700; color: ${PRIMARY}; letter-spacing: -0.5px; }
    .store-sub { font-size: 11px; color: #6B7280; margin-top: 3px; }
    .doc-title-block { text-align: right; }
    .doc-title { font-size: 18px; font-weight: 700; color: ${DARK}; }
    .doc-num { font-size: 12px; color: #6B7280; margin-top: 4px; }
    .divider { border: none; border-top: 2px solid ${PRIMARY}; margin: 18px 0; }
    .divider-thin { border: none; border-top: 1px solid #E5E7EB; margin: 12px 0; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .meta-box { background: #F8FAFC; border-radius: 10px; padding: 12px 14px; }
    .meta-label { font-size: 10px; font-weight: 600; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .meta-val { font-size: 13px; font-weight: 600; color: ${DARK}; }
    .meta-sub { font-size: 11px; color: #6B7280; margin-top: 3px; }
    table { width: 100%; border-collapse: collapse; margin-top: 4px; }
    thead tr { background: ${PRIMARY}; }
    thead th {
      color: #fff;
      font-size: 11px;
      font-weight: 600;
      text-align: left;
      padding: 10px 12px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    thead th:last-child { text-align: right; }
    tbody tr:nth-child(even) { background: #F8FAFC; }
    tbody tr:nth-child(odd) { background: #fff; }
    tbody td { padding: 10px 12px; font-size: 12px; vertical-align: middle; border-bottom: 1px solid #F1F5F9; }
    tbody td:last-child { text-align: right; font-weight: 600; color: ${PRIMARY}; }
    .qty-cell { text-align: center !important; color: #374151 !important; font-weight: 500 !important; }
    .price-cell { text-align: right !important; color: #374151 !important; }
    .total-section { margin-top: 20px; }
    .total-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; }
    .total-row.grand { background: ${PRIMARY}; color: #fff; border-radius: 10px; padding: 14px 18px; margin-top: 10px; }
    .total-label { font-size: 13px; }
    .total-val { font-size: 14px; font-weight: 700; }
    .total-row.grand .total-label, .total-row.grand .total-val { color: #fff; font-size: 15px; }
    .footer {
      margin-top: 40px;
      text-align: center;
      padding: 18px 0 0;
      border-top: 1.5px dashed #CBD5E1;
    }
    .footer-thanks { font-size: 15px; font-weight: 700; color: ${PRIMARY}; letter-spacing: 0.2px; }
    .footer-sub { font-size: 11px; color: #9CA3AF; margin-top: 5px; }
    .badge {
      display: inline-block;
      background: #EEF2FF;
      color: ${PRIMARY};
      font-size: 10px;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 5px;
      margin-right: 4px;
    }
    .sign-row { display: flex; justify-content: space-between; margin-top: 36px; gap: 32px; }
    .sign-box { flex: 1; }
    .sign-label { font-size: 11px; color: #6B7280; margin-bottom: 28px; }
    .sign-line { border-bottom: 1.5px solid #D1D5DB; padding-top: 4px; }
    .sign-name { font-size: 10px; color: #9CA3AF; margin-top: 4px; }
    .waybill-info { background: #EFF6FF; border: 1.5px solid #BFDBFE; border-radius: 10px; padding: 14px 16px; margin-bottom: 20px; }
    .waybill-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 12px; }
    .waybill-key { color: #6B7280; font-weight: 500; }
    .waybill-val { color: ${DARK}; font-weight: 600; }
    .status-chip { display: inline-block; background: #D1FAE5; color: #065F46; border-radius: 6px; padding: 3px 10px; font-size: 11px; font-weight: 600; }
    .customer-box { background: #F0F9FF; border: 1.5px solid #BAE6FD; border-radius: 10px; padding: 12px 14px; margin-bottom: 20px; }
    .customer-title { font-size: 10px; font-weight: 600; color: #0369A1; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
    .customer-row { display: flex; gap: 8px; font-size: 12px; padding: 2px 0; }
    .customer-key { color: #6B7280; min-width: 80px; }
    .customer-val { color: ${DARK}; font-weight: 600; }
    @media print {
      body { padding: 24px; }
      .no-print { display: none !important; }
    }
  `;
}

function sellerBlock(settings: StoreSettings): string {
  const s = settings.sellers[0];
  if (!s) return "";
  return `
    <div style="margin-top:4px">
      <div class="store-sub">Sotuvchi: ${s.name}</div>
      <div class="store-sub">Tel: ${s.phone}</div>
    </div>`;
}

function customerBlock(customer?: PdfCustomer | null): string {
  if (!customer || (!customer.name && !customer.phone && !customer.address)) return "";
  return `
    <div class="customer-box">
      <div class="customer-title">📋 Xaridor ma'lumotlari</div>
      ${customer.name ? `<div class="customer-row"><span class="customer-key">Ism:</span><span class="customer-val">${customer.name}</span></div>` : ""}
      ${customer.phone ? `<div class="customer-row"><span class="customer-key">Telefon:</span><span class="customer-val">${customer.phone}</span></div>` : ""}
      ${customer.address ? `<div class="customer-row"><span class="customer-key">Manzil:</span><span class="customer-val">${customer.address}</span></div>` : ""}
    </div>`;
}

// ── Invoice (Hisob-faktura) ───────────────────────────────────────────────────
export function buildInvoiceHtml(
  sale: SaleWithItems,
  settings: StoreSettings = DEFAULT_SETTINGS,
  customer?: PdfCustomer | null
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

  const primarySeller = settings.sellers[0];

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
      ${sellerBlock(settings)}
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
      <div class="sign-label">Sotuvchi: ${primarySeller ? `${primarySeller.name} · ${primarySeller.phone}` : ""}</div>
      <div class="sign-line"></div>
      <div class="sign-name">Imzo</div>
    </div>
    <div class="sign-box">
      <div class="sign-label">Xaridor: ${customer?.name ?? "________________________"}</div>
      <div class="sign-line"></div>
      <div class="sign-name">Imzo</div>
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
  customer?: PdfCustomer | null
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

  const primarySeller = settings.sellers[0];

  return `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Savdo cheki #${sale.id}</title>
  <style>
    ${baseStyles()}
    body { max-width: 420px; padding: 24px 28px; }
    .receipt-header { text-align: center; margin-bottom: 20px; }
    .receipt-logo { font-size: 20px; font-weight: 700; color: ${PRIMARY}; }
    .receipt-sub { font-size: 11px; color: #6B7280; margin-top: 2px; }
    .receipt-title { font-size: 14px; font-weight: 700; margin-top: 12px; letter-spacing: 2px; color: ${DARK}; }
    .receipt-meta { display: flex; justify-content: space-between; font-size: 12px; margin: 14px 0; color: #374151; }
    .receipt-meta span { color: #6B7280; margin-right: 4px; }
    .dashed { border-top: 1.5px dashed #CBD5E1; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="receipt-header">
    <div class="receipt-logo">${settings.storeName}</div>
    <div class="receipt-sub">${settings.storeSubtitle}</div>
    ${settings.storeAddress ? `<div class="receipt-sub">📍 ${settings.storeAddress}</div>` : ""}
    ${primarySeller ? `<div class="receipt-sub">Sotuvchi: ${primarySeller.name} · ${primarySeller.phone}</div>` : ""}
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

  <div class="sign-row" style="margin-top:28px">
    <div class="sign-box">
      <div class="sign-label" style="font-size:11px;color:#6B7280;margin-bottom:22px">Sotuvchi: ${primarySeller?.name ?? ""}</div>
      <div class="sign-line"></div>
      <div class="sign-name">Imzo</div>
    </div>
    <div class="sign-box">
      <div class="sign-label" style="font-size:11px;color:#6B7280;margin-bottom:22px">Xaridor: ${customer?.name ?? ""}</div>
      <div class="sign-line"></div>
      <div class="sign-name">Imzo</div>
    </div>
  </div>

  <div class="footer" style="margin-top:28px">
    <div class="footer-thanks">Xaridingiz uchun tashakkur!</div>
    <div class="footer-sub">${settings.storeName} — ${fmtDate(sale.createdAt)}</div>
  </div>
</body>
</html>`;
}

// ── Waybill (Yuk xati) ────────────────────────────────────────────────────────
export function buildWaybillHtml(
  sale: SaleWithItems,
  settings: StoreSettings = DEFAULT_SETTINGS,
  customer?: PdfCustomer | null
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

  const primarySeller = settings.sellers[0];

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
      ${sellerBlock(settings)}
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
      ${primarySeller ? `
        <div class="meta-sub">${primarySeller.name}</div>
        <div class="meta-sub">📞 ${primarySeller.phone}</div>
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
      <div class="sign-label">Jo'natuvchi: ${primarySeller ? `${primarySeller.name}` : ""}</div>
      <div class="sign-line"></div>
      <div class="sign-name">F.I.Sh / Imzo / Muhr</div>
    </div>
    <div class="sign-box">
      <div class="sign-label">Qabul qiluvchi: ${customer?.name ?? ""}</div>
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
