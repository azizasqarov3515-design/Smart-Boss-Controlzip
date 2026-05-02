import { db } from "@workspace/db";
import { productsTable } from "@workspace/db/schema";
import { saleItemsTable, salesTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

const router = Router();

const createSaleSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
  note: z.string().optional().nullable(),
});

router.get("/sales", async (req, res) => {
  try {
    const sales = await db
      .select()
      .from(salesTable)
      .orderBy(sql`${salesTable.createdAt} desc`);

    const result = await Promise.all(
      sales.map(async (sale) => {
        const items = await db
          .select()
          .from(saleItemsTable)
          .where(eq(saleItemsTable.saleId, sale.id));
        return {
          id: sale.id,
          totalAmount: parseFloat(sale.totalAmount),
          itemCount: sale.itemCount,
          note: sale.note ?? null,
          createdAt: sale.createdAt.toISOString(),
          items: items.map((i) => ({
            id: i.id,
            productId: i.productId ?? null,
            productName: i.productName,
            brand: i.brand,
            unitPrice: parseFloat(i.unitPrice),
            quantity: i.quantity,
            totalPrice: parseFloat(i.totalPrice),
          })),
        };
      })
    );
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to get sales");
    res.status(500).json({ error: "Failed to get sales" });
  }
});

router.post("/sales", async (req, res) => {
  try {
    const body = createSaleSchema.parse(req.body);

    // Fetch all products in one query
    const productIds = body.items.map((i) => i.productId);
    const products = await db
      .select()
      .from(productsTable)
      .where(sql`${productsTable.id} = ANY(${sql.raw(`ARRAY[${productIds.join(",")}]`)})`);

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Validate stock availability
    for (const item of body.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        res.status(404).json({ error: `Mahsulot topilmadi: ID ${item.productId}` });
        return;
      }
      if (product.quantity < item.quantity) {
        res.status(400).json({
          error: `"${product.name}" mahsulotida yetarli stok yo'q. Mavjud: ${product.quantity}, so'ralgan: ${item.quantity}`,
        });
        return;
      }
    }

    // Calculate totals
    let totalAmount = 0;
    const saleItemsData = body.items.map((item) => {
      const product = productMap.get(item.productId)!;
      const unitPrice = parseFloat(product.salePrice);
      const totalPrice = unitPrice * item.quantity;
      totalAmount += totalPrice;
      return {
        productId: product.id,
        productName: product.name,
        brand: product.brand,
        unitPrice: String(unitPrice),
        quantity: item.quantity,
        totalPrice: String(totalPrice),
      };
    });

    const totalItemCount = body.items.reduce((sum, i) => sum + i.quantity, 0);

    // Create sale + sale items + decrement stock in a transaction
    const saleResult = await db.transaction(async (tx) => {
      const [sale] = await tx
        .insert(salesTable)
        .values({
          totalAmount: String(totalAmount),
          itemCount: totalItemCount,
          note: body.note ?? null,
        })
        .returning();

      const insertedItems = await tx
        .insert(saleItemsTable)
        .values(saleItemsData.map((d) => ({ ...d, saleId: sale.id })))
        .returning();

      // Decrement stock for each product
      for (const item of body.items) {
        await tx
          .update(productsTable)
          .set({ quantity: sql`${productsTable.quantity} - ${item.quantity}` })
          .where(eq(productsTable.id, item.productId));
      }

      return { sale, items: insertedItems };
    });

    res.status(201).json({
      id: saleResult.sale.id,
      totalAmount: parseFloat(saleResult.sale.totalAmount),
      itemCount: saleResult.sale.itemCount,
      note: saleResult.sale.note ?? null,
      createdAt: saleResult.sale.createdAt.toISOString(),
      items: saleResult.items.map((i) => ({
        id: i.id,
        productId: i.productId ?? null,
        productName: i.productName,
        brand: i.brand,
        unitPrice: parseFloat(i.unitPrice),
        quantity: i.quantity,
        totalPrice: parseFloat(i.totalPrice),
      })),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.issues });
      return;
    }
    req.log.error({ err }, "Failed to create sale");
    res.status(500).json({ error: "Failed to create sale" });
  }
});

router.get("/products/barcode/:barcode", async (req, res) => {
  try {
    const barcode = req.params["barcode"];
    if (!barcode) {
      res.status(400).json({ error: "Barcode required" });
      return;
    }
    const [product] = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.barcode, barcode))
      .limit(1);

    if (!product) {
      res.status(404).json({ error: "Mahsulot topilmadi" });
      return;
    }
    res.json({
      id: product.id,
      name: product.name,
      brand: product.brand,
      costPrice: parseFloat(product.costPrice),
      salePrice: parseFloat(product.salePrice),
      quantity: product.quantity,
      barcode: product.barcode ?? null,
      createdAt: product.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get product by barcode");
    res.status(500).json({ error: "Failed to get product by barcode" });
  }
});

export default router;
