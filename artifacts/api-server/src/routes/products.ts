import { db } from "@workspace/db";
import { productsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

const router = Router();

// Independent input schema — does NOT extend drizzle-zod (zod/v4 vs zod v3 incompatibility).
// Prices are stored as PG numeric (string) so we coerce number→string before insert.
const productInputSchema = z.object({
  name: z.string().trim().min(1, "Nomi kiritilishi shart"),
  brand: z.string().trim().min(1, "Brendi kiritilishi shart"),
  costPrice: z
    .union([z.string(), z.number()])
    .transform((v) => String(v)),
  salePrice: z
    .union([z.string(), z.number()])
    .transform((v) => String(v)),
  quantity: z
    .union([z.string(), z.number()])
    .transform((v) => parseInt(String(v), 10))
    .pipe(z.number().int().min(0)),
  barcode: z.string().trim().min(1).nullish().transform((v) => v ?? null),
});

type ProductRow = {
  id: number;
  name: string;
  brand: string;
  costPrice: string;
  salePrice: string;
  quantity: number;
  barcode: string | null;
  createdAt: Date;
};

function mapProduct(p: ProductRow) {
  return {
    id: p.id,
    name: p.name,
    brand: p.brand,
    costPrice: parseFloat(p.costPrice),
    salePrice: parseFloat(p.salePrice),
    quantity: p.quantity,
    barcode: p.barcode ?? null,
    createdAt: p.createdAt.toISOString(),
  };
}

// GET /products
router.get("/products", async (req, res) => {
  try {
    const products = await db
      .select()
      .from(productsTable)
      .orderBy(productsTable.createdAt);
    res.json(products.map(mapProduct));
  } catch (err) {
    req.log.error({ err }, "Failed to get products");
    res.status(500).json({ error: "Failed to get products" });
  }
});

// POST /products
router.post("/products", async (req, res) => {
  const parsed = productInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const d = parsed.data;
    const [product] = await db
      .insert(productsTable)
      .values({
        name: d.name,
        brand: d.brand,
        costPrice: d.costPrice,
        salePrice: d.salePrice,
        quantity: d.quantity,
        barcode: d.barcode,
      })
      .returning();
    res.status(201).json(mapProduct(product!));
  } catch (err) {
    req.log.error({ err }, "Failed to create product");
    res.status(500).json({ error: "Failed to create product" });
  }
});

// GET /products/barcode/:barcode  — must be before /:id
router.get("/products/barcode/:barcode", async (req, res) => {
  try {
    const barcode = req.params["barcode"]!;
    const [product] = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.barcode, barcode))
      .limit(1);
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json(mapProduct(product));
  } catch (err) {
    req.log.error({ err }, "Failed to get product by barcode");
    res.status(500).json({ error: "Failed to get product by barcode" });
  }
});

// PUT /products/:id
router.put("/products/:id", async (req, res) => {
  const id = parseInt(req.params["id"] ?? "");
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid product id" });
    return;
  }
  const parsed = productInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const d = parsed.data;
    const [product] = await db
      .update(productsTable)
      .set({
        name: d.name,
        brand: d.brand,
        costPrice: d.costPrice,
        salePrice: d.salePrice,
        quantity: d.quantity,
        barcode: d.barcode,
      })
      .where(eq(productsTable.id, id))
      .returning();
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json(mapProduct(product));
  } catch (err) {
    req.log.error({ err }, "Failed to update product");
    res.status(500).json({ error: "Failed to update product" });
  }
});

// DELETE /products/:id
router.delete("/products/:id", async (req, res) => {
  const id = parseInt(req.params["id"] ?? "");
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid product id" });
    return;
  }
  try {
    await db.delete(productsTable).where(eq(productsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete product");
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// GET /dashboard/stats
router.get("/dashboard/stats", async (req, res) => {
  try {
    const [stats] = await db
      .select({
        totalProducts: sql<number>`count(*)::int`,
        totalItems: sql<number>`coalesce(sum(${productsTable.quantity}), 0)::int`,
        totalCostValue: sql<number>`coalesce(sum(${productsTable.costPrice}::numeric * ${productsTable.quantity}), 0)::numeric`,
        totalSaleValue: sql<number>`coalesce(sum(${productsTable.salePrice}::numeric * ${productsTable.quantity}), 0)::numeric`,
        lowStockCount: sql<number>`count(case when ${productsTable.quantity} < 5 then 1 end)::int`,
      })
      .from(productsTable);

    res.json({
      totalProducts: stats?.totalProducts ?? 0,
      totalItems: stats?.totalItems ?? 0,
      totalCostValue: parseFloat(String(stats?.totalCostValue ?? 0)),
      totalSaleValue: parseFloat(String(stats?.totalSaleValue ?? 0)),
      lowStockCount: stats?.lowStockCount ?? 0,
      todaySales: 0,
      todayTransactions: 0,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard stats");
    res.status(500).json({ error: "Failed to get dashboard stats" });
  }
});

export default router;
