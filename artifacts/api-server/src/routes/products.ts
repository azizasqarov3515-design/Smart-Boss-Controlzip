import { db } from "@workspace/db";
import { productsTable } from "@workspace/db/schema";
import { and, eq, or, sql } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

const router = Router();

const VALID_UNITS = ["dona", "kg", "m"] as const;

const productInputSchema = z.object({
  name: z.string().trim().min(1, "Nomi kiritilishi shart"),
  brand: z.string().trim(),
  costPrice: z
    .union([z.string(), z.number()])
    .transform((v) => String(v)),
  salePrice: z
    .union([z.string(), z.number()])
    .transform((v) => String(v)),
  quantity: z
    .union([z.string(), z.number()])
    .transform((v) => parseFloat(String(v)))
    .pipe(z.number().min(0)),
  unit: z.enum(VALID_UNITS).optional().default("dona"),
  thickness: z
    .union([z.string(), z.number()])
    .transform((v) => parseFloat(String(v)))
    .pipe(z.number().min(0))
    .nullish()
    .transform((v) => (v != null && !isNaN(v) ? String(v) : null)),
  barcode: z.string().trim().min(1).nullish().transform((v) => v ?? null),
  imageUrl: z.string().url().nullish().transform((v) => v ?? null),
});

type ProductRow = {
  id: number;
  managerId: number | null;
  name: string;
  brand: string;
  costPrice: string;
  salePrice: string;
  quantity: string;
  unit: string;
  thickness: string | null;
  barcode: string | null;
  imageUrl: string | null;
  createdAt: Date;
};

function mapProduct(p: ProductRow) {
  return {
    id: p.id,
    name: p.name,
    brand: p.brand,
    costPrice: parseFloat(p.costPrice),
    salePrice: parseFloat(p.salePrice),
    quantity: parseFloat(p.quantity),
    unit: (VALID_UNITS as readonly string[]).includes(p.unit) ? p.unit : "dona",
    thickness: p.thickness != null ? parseFloat(p.thickness) : null,
    barcode: p.barcode ?? null,
    imageUrl: p.imageUrl ?? null,
    createdAt: p.createdAt.toISOString(),
  };
}

// GET /products
router.get("/products", async (req, res) => {
  try {
    const managerId = res.locals.user?.managerId;
    const condition = managerId !== undefined ? eq(productsTable.managerId, managerId) : undefined;
    const products = await db
      .select()
      .from(productsTable)
      .where(condition)
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
    const managerId = res.locals.user?.managerId ?? null;
    const [product] = await db
      .insert(productsTable)
      .values({
        managerId,
        name: d.name,
        brand: d.brand,
        costPrice: d.costPrice,
        salePrice: d.salePrice,
        quantity: String(d.quantity),
        unit: d.unit,
        thickness: d.thickness,
        barcode: d.barcode,
        imageUrl: d.imageUrl,
      })
      .returning();
    res.status(201).json(mapProduct(product!));
  } catch (err) {
    req.log.error({ err }, "Failed to create product");
    res.status(500).json({ error: "Failed to create product" });
  }
});

// GET /products/barcode/:barcode — must be before /:id
router.get("/products/barcode/:barcode", async (req, res) => {
  try {
    const barcode = req.params["barcode"]!;
    const managerId = res.locals.user?.managerId;
    const matchCondition = or(
      eq(productsTable.barcode, barcode),
      eq(productsTable.name, barcode),
    );
    const condition = managerId !== undefined
      ? and(matchCondition, eq(productsTable.managerId, managerId))
      : matchCondition;
    const [product] = await db
      .select()
      .from(productsTable)
      .where(condition)
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
    const managerId = res.locals.user?.managerId;
    const condition = managerId !== undefined
      ? and(eq(productsTable.id, id), eq(productsTable.managerId, managerId))
      : eq(productsTable.id, id);
    const [product] = await db
      .update(productsTable)
      .set({
        name: d.name,
        brand: d.brand,
        costPrice: d.costPrice,
        salePrice: d.salePrice,
        quantity: String(d.quantity),
        unit: d.unit,
        thickness: d.thickness,
        barcode: d.barcode,
        imageUrl: d.imageUrl,
      })
      .where(condition)
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
    const managerId = res.locals.user?.managerId;
    const condition = managerId !== undefined
      ? and(eq(productsTable.id, id), eq(productsTable.managerId, managerId))
      : eq(productsTable.id, id);
    await db.delete(productsTable).where(condition);
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete product");
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// GET /dashboard/stats
router.get("/dashboard/stats", async (req, res) => {
  try {
    const managerId = res.locals.user?.managerId;
    const mgrCond = managerId !== undefined ? eq(productsTable.managerId, managerId) : undefined;

    const [stats] = await db
      .select({
        totalProducts: sql<number>`count(*)::int`,
        totalItems: sql<number>`coalesce(sum(${productsTable.quantity}::numeric), 0)::numeric`,
        totalCostValue: sql<number>`coalesce(sum(${productsTable.costPrice}::numeric * ${productsTable.quantity}::numeric), 0)::numeric`,
        totalSaleValue: sql<number>`coalesce(sum(${productsTable.salePrice}::numeric * ${productsTable.quantity}::numeric), 0)::numeric`,
        lowStockCount: sql<number>`count(case when ${productsTable.quantity}::numeric < 5 then 1 end)::int`,
      })
      .from(productsTable)
      .where(mgrCond);

    const { customersTable, salesTable, saleItemsTable } = await import("@workspace/db/schema");

    const custCond = managerId !== undefined ? eq(customersTable.managerId, managerId) : undefined;
    const [debtStats] = await db
      .select({
        totalDebt: sql<number>`coalesce(sum(${customersTable.totalDebt}::numeric), 0)::numeric`,
      })
      .from(customersTable)
      .where(custCond);

    const mgrSaleCond = managerId !== undefined
      ? sql`s.manager_id = ${managerId}`
      : sql`1=1`;

    const profitResult = await db.execute(sql`
      SELECT COALESCE(SUM((si.unit_price::numeric - p.cost_price::numeric) * si.quantity::numeric), 0) AS today_net_profit
      FROM ${saleItemsTable} si
      JOIN ${salesTable} s ON si.sale_id = s.id
      JOIN ${productsTable} p ON si.product_id = p.id
      WHERE s.created_at::date = CURRENT_DATE
        AND ${mgrSaleCond}
    `);
    const profitStats = profitResult.rows[0] as Record<string, unknown> | undefined;

    res.json({
      totalProducts: stats?.totalProducts ?? 0,
      totalItems: parseFloat(String(stats?.totalItems ?? 0)),
      totalCostValue: parseFloat(String(stats?.totalCostValue ?? 0)),
      totalSaleValue: parseFloat(String(stats?.totalSaleValue ?? 0)),
      lowStockCount: stats?.lowStockCount ?? 0,
      todaySales: 0,
      todayTransactions: 0,
      totalDebt: parseFloat(String(debtStats?.totalDebt ?? 0)),
      todayNetProfit: parseFloat(String((profitStats as Record<string, unknown>)?.["today_net_profit"] ?? 0)),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard stats");
    res.status(500).json({ error: "Failed to get dashboard stats" });
  }
});

export default router;
