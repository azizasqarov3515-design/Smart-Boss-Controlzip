import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable } from "@workspace/db/schema";
import { saleItemsTable, salesTable } from "@workspace/db/schema";

const router = Router();

router.get("/backup/download", async (req, res) => {
  try {
    const [products, sales, saleItems] = await Promise.all([
      db.select().from(productsTable).orderBy(productsTable.id),
      db.select().from(salesTable).orderBy(salesTable.id),
      db.select().from(saleItemsTable).orderBy(saleItemsTable.id),
    ]);

    const backup = {
      exportedAt: new Date().toISOString(),
      version: "1.0",
      appName: "SMARTBOSScontrol",
      summary: {
        totalProducts: products.length,
        totalSales: sales.length,
        totalSaleItems: saleItems.length,
      },
      data: {
        products: products.map((p) => ({
          id: p.id,
          name: p.name,
          brand: p.brand,
          costPrice: parseFloat(p.costPrice),
          salePrice: parseFloat(p.salePrice),
          quantity: p.quantity,
          barcode: p.barcode ?? null,
          createdAt: p.createdAt.toISOString(),
        })),
        sales: sales.map((s) => ({
          id: s.id,
          totalAmount: parseFloat(s.totalAmount),
          itemCount: s.itemCount,
          note: s.note ?? null,
          createdAt: s.createdAt.toISOString(),
        })),
        saleItems: saleItems.map((i) => ({
          id: i.id,
          saleId: i.saleId,
          productId: i.productId ?? null,
          productName: i.productName,
          brand: i.brand,
          unitPrice: parseFloat(i.unitPrice),
          quantity: i.quantity,
          totalPrice: parseFloat(i.totalPrice),
        })),
      },
    };

    const filename = `smartboss-backup-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.json(backup);
  } catch (err) {
    req.log.error({ err }, "Failed to generate backup");
    res.status(500).json({ error: "Backup yaratishda xato" });
  }
});

export default router;
