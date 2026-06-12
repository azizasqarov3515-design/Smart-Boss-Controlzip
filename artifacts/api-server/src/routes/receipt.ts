import { Router } from "express";
import { db } from "@workspace/db";
import { salesTable, saleItemsTable, managersTable, customersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

function fmtDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
}

function fmtMoney(n: number): string {
  return n.toLocaleString("uz-UZ") + " UZS";
}

router.get("/receipt/:id", async (req, res) => {
  try {
    const saleId = parseInt(req.params.id, 10);
    if (isNaN(saleId)) {
      res.status(400).send("Noto'g'ri chek ID kodi");
      return;
    }

    // Fetch sale
    const [sale] = await db.select().from(salesTable).where(eq(salesTable.id, saleId)).limit(1);
    if (!sale) {
      res.status(404).send("Chek topilmadi");
      return;
    }

    // Fetch manager
    let storeName = "SMARTBOSS";
    let storeAddress = "";
    let managerPhone = "";
    if (sale.managerId) {
      const [manager] = await db.select().from(managersTable).where(eq(managersTable.id, sale.managerId)).limit(1);
      if (manager) {
        storeName = manager.storeName;
        storeAddress = manager.storeAddress;
        managerPhone = manager.phone;
      }
    }

    // Fetch customer
    let customerName = "";
    let customerPhone = "";
    if (sale.customerId) {
      const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, sale.customerId)).limit(1);
      if (customer) {
        customerName = customer.name;
        customerPhone = customer.phone;
      }
    }

    // Fetch items
    const items = await db.select().from(saleItemsTable).where(eq(saleItemsTable.saleId, saleId));

    const totalAmount = parseFloat(sale.totalAmount);
    const paidAmount = sale.paidAmount ? parseFloat(sale.paidAmount) : totalAmount;
    const debtAmount = sale.debtAmount ? parseFloat(sale.debtAmount) : 0;

    const rowsHtml = items.map((item, i) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${i + 1}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">
          <strong>${item.productName}</strong><br/>
          <span style="color: #666; font-size: 11px;">${item.brand}</span>
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${parseFloat(item.quantity as unknown as string)} ${item.unit || "dona"}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${fmtMoney(parseFloat(item.unitPrice))}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold; color: #2563eb;">${fmtMoney(parseFloat(item.totalPrice))}</td>
      </tr>
    `).join("");

    const html = `
<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Savdo cheki #${sale.id}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: #f3f4f6;
      margin: 0;
      padding: 16px;
      display: flex;
      justify-content: center;
    }
    .container {
      background: white;
      max-width: 480px;
      width: 100%;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      padding: 24px;
      box-sizing: border-box;
    }
    .header { text-align: center; margin-bottom: 20px; }
    .logo { font-size: 22px; font-weight: 800; color: #2563eb; letter-spacing: -0.5px; }
    .subtitle { font-size: 12px; color: #666; margin-top: 4px; }
    .divider { border: none; border-top: 2px dashed #e5e7eb; margin: 16px 0; }
    .meta-row { display: flex; justify-content: space-between; font-size: 13px; margin: 6px 0; color: #374151; }
    .meta-label { color: #6b7280; }
    .meta-value { font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
    th { background: #f8fafc; color: #475569; font-weight: 600; padding: 8px; text-align: left; }
    .total-box { margin-top: 20px; background: #f8fafc; border-radius: 12px; padding: 16px; }
    .total-row { display: flex; justify-content: space-between; align-items: center; margin: 6px 0; font-size: 14px; }
    .grand-total { font-size: 18px; font-weight: 800; color: #1e3a8a; border-top: 1px solid #e2e8f0; padding-top: 10px; margin-top: 10px; }
    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #94a3b8; }
    .btn-print {
      display: block;
      width: 100%;
      background: #2563eb;
      color: white;
      text-align: center;
      padding: 12px;
      border-radius: 10px;
      font-weight: 600;
      text-decoration: none;
      margin-top: 20px;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
    }
    @media print {
      body { background: white; padding: 0; }
      .container { box-shadow: none; padding: 0; max-width: 100%; }
      .btn-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">${storeName}</div>
      <div class="subtitle">Boshqaruv va POS Tizimi</div>
      ${storeAddress ? `<div class="subtitle">📍 ${storeAddress}</div>` : ""}
      ${managerPhone ? `<div class="subtitle">Tel: ${managerPhone}</div>` : ""}
    </div>

    <div class="divider"></div>

    <div class="meta-row">
      <span class="meta-label">Chek raqami:</span>
      <span class="meta-value">RCP-${String(sale.id).padStart(5, "0")}</span>
    </div>
    <div class="meta-row">
      <span class="meta-label">Sana:</span>
      <span class="meta-value">${fmtDate(sale.createdAt)} ${fmtTime(sale.createdAt)}</span>
    </div>
    <div class="meta-row">
      <span class="meta-label">To'lov turi:</span>
      <span class="meta-value">${sale.paymentType === "cash" ? "💵 Naqd" : sale.paymentType === "card" ? "💳 Karta" : "📋 Qarz"}</span>
    </div>

    ${customerName ? `
      <div class="divider"></div>
      <div class="meta-row">
        <span class="meta-label">Xaridor:</span>
        <span class="meta-value">${customerName}</span>
      </div>
      ${customerPhone ? `
        <div class="meta-row">
          <span class="meta-label">Telefon:</span>
          <span class="meta-value">${customerPhone}</span>
        </div>
      ` : ""}
    ` : ""}

    <div class="divider"></div>

    <table>
      <thead>
        <tr>
          <th style="width: 30px; text-align: center;">#</th>
          <th>Mahsulot</th>
          <th style="width: 60px; text-align: center;">Dona</th>
          <th style="width: 90px; text-align: right;">Narx</th>
          <th style="width: 100px; text-align: right;">Jami</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div class="total-box">
      <div class="total-row">
        <span class="meta-label">Mahsulot turlari:</span>
        <span class="meta-value">${items.length} xil</span>
      </div>
      <div class="total-row">
        <span class="meta-label">Jami dona:</span>
        <span class="meta-value">${sale.itemCount} ta</span>
      </div>
      ${sale.note ? `
        <div class="total-row">
          <span class="meta-label">Izoh:</span>
          <span class="meta-value" style="font-style: italic;">${sale.note}</span>
        </div>
      ` : ""}
      <div class="total-row grand-total">
        <span>Umumiy summa:</span>
        <span>${fmtMoney(totalAmount)}</span>
      </div>
      ${debtAmount > 0 ? `
        <div class="total-row" style="margin-top: 10px; color: #059669; font-weight: 600;">
          <span>To'langan summa:</span>
          <span>${fmtMoney(paidAmount)}</span>
        </div>
        <div class="total-row" style="color: #dc2626; font-weight: 700;">
          <span>Qarz summasi:</span>
          <span>${fmtMoney(debtAmount)}</span>
        </div>
      ` : ""}
    </div>

    <button onclick="window.print()" class="btn-print">Chekni chop etish</button>

    <div class="footer">
      <p>Xaridingiz uchun rahmat!</p>
      <p style="margin-top: 4px; font-size: 10px;">Powered by SMARTBOSScontrol</p>
    </div>
  </div>
</body>
</html>
    `;
    res.send(html);
  } catch (err) {
    req.log.error({ err }, "Failed to render receipt");
    res.status(500).send("Chekni yuklashda xatolik yuz berdi");
  }
});

export default router;
