import { db } from "@workspace/db";
import { insertProductSchema, productsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

const router = Router();

router.get("/products", async (req, res) => {
  try {
    const products = await db.select().from(productsTable).orderBy(productsTable.createdAt);
    const mapped = products.map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      costPrice: parseFloat(p.costPrice),
      salePrice: parseFloat(p.salePrice),
      quantity: p.quantity,
      createdAt: p.createdAt.toISOString(),
    }));
    res.json(mapped);
  } catch (err) {
    req.log.error({ err }, "Failed to get products");
    res.status(500).json({ error: "Failed to get products" });
  }
});

router.post("/products", async (req, res) => {
  try {
    const data = insertProductSchema.parse(req.body);
    const [product] = await db.insert(productsTable).values(data).returning();
    res.status(201).json({
      id: product.id,
      name: product.name,
      brand: product.brand,
      costPrice: parseFloat(product.costPrice),
      salePrice: parseFloat(product.salePrice),
      quantity: product.quantity,
      createdAt: product.createdAt.toISOString(),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.issues });
      return;
    }
    req.log.error({ err }, "Failed to create product");
    res.status(500).json({ error: "Failed to create product" });
  }
});

router.put("/products/:id", async (req, res) => {
  try {
    const id = parseInt(req.params["id"] ?? "");
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid product id" });
      return;
    }
    const data = insertProductSchema.parse(req.body);
    const [product] = await db
      .update(productsTable)
      .set(data)
      .where(eq(productsTable.id, id))
      .returning();
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json({
      id: product.id,
      name: product.name,
      brand: product.brand,
      costPrice: parseFloat(product.costPrice),
      salePrice: parseFloat(product.salePrice),
      quantity: product.quantity,
      createdAt: product.createdAt.toISOString(),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.issues });
      return;
    }
    req.log.error({ err }, "Failed to update product");
    res.status(500).json({ error: "Failed to update product" });
  }
});

router.delete("/products/:id", async (req, res) => {
  try {
    const id = parseInt(req.params["id"] ?? "");
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid product id" });
      return;
    }
    await db.delete(productsTable).where(eq(productsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete product");
    res.status(500).json({ error: "Failed to delete product" });
  }
});

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
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard stats");
    res.status(500).json({ error: "Failed to get dashboard stats" });
  }
});

export default router;
