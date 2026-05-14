import { db } from "@workspace/db";
import { customersTable, productsTable, saleItemsTable, salesTable } from "@workspace/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

const router = Router();

const createSaleSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.number().positive(),
      })
    )
    .min(1),
  note: z.string().optional().nullable(),
  paymentType: z.enum(["cash", "card", "debt"]).optional().default("cash"),
  customerId: z.number().int().positive().optional().nullable(),
  paidAmount: z.number().min(0).optional().nullable(),
});

function mapSaleRow(
  sale: typeof salesTable.$inferSelect,
  items: (typeof saleItemsTable.$inferSelect)[],
  customerName?: string | null
) {
  return {
    id: sale.id,
    totalAmount: parseFloat(sale.totalAmount),
    itemCount: sale.itemCount,
    note: sale.note ?? null,
    paymentType: sale.paymentType,
    customerId: sale.customerId ?? null,
    customerName: customerName ?? null,
    paidAmount: sale.paidAmount ? parseFloat(sale.paidAmount) : null,
    debtAmount: sale.debtAmount ? parseFloat(sale.debtAmount) : null,
    createdAt: sale.createdAt.toISOString(),
    items: items.map((i) => ({
      id: i.id,
      productId: i.productId ?? null,
      productName: i.productName,
      brand: i.brand,
      unitPrice: parseFloat(i.unitPrice),
      quantity: parseFloat(i.quantity as unknown as string),
      unit: i.unit ?? "dona",
      totalPrice: parseFloat(i.totalPrice),
    })),
  };
}

router.get("/sales", async (req, res) => {
  try {
    const managerId = res.locals.user?.managerId;
    const condition = managerId !== undefined ? eq(salesTable.managerId, managerId) : undefined;

    const sales = await db
      .select()
      .from(salesTable)
      .where(condition)
      .orderBy(sql`${salesTable.createdAt} desc`);

    const customerIds = [...new Set(sales.map((s) => s.customerId).filter(Boolean) as number[])];
    const customerMap = new Map<number, string>();
    if (customerIds.length > 0) {
      const customers = await db
        .select({ id: customersTable.id, name: customersTable.name })
        .from(customersTable)
        .where(sql`${customersTable.id} = ANY(${sql.raw(`ARRAY[${customerIds.join(",")}]`)})`);
      for (const c of customers) customerMap.set(c.id, c.name);
    }

    const result = await Promise.all(
      sales.map(async (sale) => {
        const items = await db
          .select()
          .from(saleItemsTable)
          .where(eq(saleItemsTable.saleId, sale.id));
        return mapSaleRow(
          sale,
          items,
          sale.customerId ? customerMap.get(sale.customerId) : null
        );
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
    const managerId = res.locals.user?.managerId ?? null;

    if (body.paymentType === "debt" && !body.customerId) {
      res.status(400).json({ error: "Qarz uchun mijoz tanlanishi shart" });
      return;
    }

    const productIds = body.items.map((i) => i.productId);
    const mgrProdCond = managerId !== null
      ? and(sql`${productsTable.id} = ANY(${sql.raw(`ARRAY[${productIds.join(",")}]`)})`, eq(productsTable.managerId, managerId))
      : sql`${productsTable.id} = ANY(${sql.raw(`ARRAY[${productIds.join(",")}]`)})`;

    const products = await db
      .select()
      .from(productsTable)
      .where(mgrProdCond);

    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const item of body.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        res.status(404).json({ error: `Mahsulot topilmadi: ID ${item.productId}` });
        return;
      }
      const stockQty = parseFloat(product.quantity as unknown as string);
      if (stockQty < item.quantity) {
        res.status(400).json({
          error: `"${product.name}" mahsulotida yetarli stok yo'q. Mavjud: ${stockQty}, so'ralgan: ${item.quantity}`,
        });
        return;
      }
    }

    let totalAmount = 0;
    const saleItemsData = body.items.map((item) => {
      const product = productMap.get(item.productId)!;
      const unitPrice = parseFloat(product.salePrice);
      const qty = Math.round(item.quantity * 1000) / 1000;
      const totalPrice = Math.round(unitPrice * qty * 100) / 100;
      totalAmount += totalPrice;
      return {
        productId: product.id,
        productName: product.name,
        brand: product.brand,
        unitPrice: String(unitPrice),
        quantity: String(qty),
        unit: (product as any).unit ?? "dona",
        totalPrice: String(totalPrice),
      };
    });
    totalAmount = Math.round(totalAmount * 100) / 100;

    const totalItemCount = body.items.length;

    const paidAmount =
      body.paymentType === "debt"
        ? (body.paidAmount ?? 0)
        : totalAmount;
    const debtAmount =
      body.paymentType === "debt" ? totalAmount - paidAmount : 0;

    let customerName: string | null = null;
    if (body.customerId) {
      const custCond = managerId !== null
        ? and(eq(customersTable.id, body.customerId), eq(customersTable.managerId, managerId))
        : eq(customersTable.id, body.customerId);
      const [customer] = await db.select().from(customersTable).where(custCond);
      if (!customer) {
        res.status(404).json({ error: "Mijoz topilmadi" });
        return;
      }
      customerName = customer.name;
      const currentDebt = parseFloat(customer.totalDebt);
      const limit = parseFloat(customer.debtLimit);
      if (limit > 0 && currentDebt + debtAmount > limit) {
        res.status(400).json({
          error: `Qarz limiti oshib ketdi. Mijozning joriy qarzi: ${currentDebt.toLocaleString()} UZS, limit: ${limit.toLocaleString()} UZS`,
        });
        return;
      }
    }

    const saleResult = await db.transaction(async (tx) => {
      const [sale] = await tx
        .insert(salesTable)
        .values({
          managerId,
          totalAmount: String(totalAmount),
          itemCount: totalItemCount,
          note: body.note ?? null,
          paymentType: body.paymentType,
          customerId: body.customerId ?? null,
          paidAmount: String(paidAmount),
          debtAmount: String(debtAmount),
        })
        .returning();

      const insertedItems = await tx
        .insert(saleItemsTable)
        .values(saleItemsData.map((d) => ({ ...d, saleId: sale.id })))
        .returning();

      for (const item of body.items) {
        await tx
          .update(productsTable)
          .set({ quantity: sql`${productsTable.quantity} - ${item.quantity}` })
          .where(eq(productsTable.id, item.productId));
      }

      if (body.customerId && debtAmount > 0) {
        await tx
          .update(customersTable)
          .set({
            totalDebt: sql`${customersTable.totalDebt} + ${String(debtAmount)}`,
          })
          .where(eq(customersTable.id, body.customerId));
      }

      return { sale, items: insertedItems };
    });

    res.status(201).json(mapSaleRow(saleResult.sale, saleResult.items, customerName));
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.issues });
      return;
    }
    req.log.error({ err }, "Failed to create sale");
    res.status(500).json({ error: "Failed to create sale" });
  }
});

async function deleteSaleById(saleId: number, managerId: number | null) {
  const condition = managerId !== null
    ? and(eq(salesTable.id, saleId), eq(salesTable.managerId, managerId))
    : eq(salesTable.id, saleId);

  const [sale] = await db.select().from(salesTable).where(condition);
  if (!sale) return null;

  const items = await db.select().from(saleItemsTable).where(eq(saleItemsTable.saleId, saleId));

  await db.transaction(async (tx) => {
    for (const item of items) {
      if (item.productId != null) {
        await tx
          .update(productsTable)
          .set({ quantity: sql`${productsTable.quantity} + ${item.quantity}` })
          .where(eq(productsTable.id, item.productId));
      }
    }
    if (sale.customerId && sale.debtAmount && parseFloat(sale.debtAmount) > 0) {
      await tx
        .update(customersTable)
        .set({
          totalDebt: sql`GREATEST(0, ${customersTable.totalDebt} - ${sale.debtAmount})`,
        })
        .where(eq(customersTable.id, sale.customerId));
    }
    await tx.delete(saleItemsTable).where(eq(saleItemsTable.saleId, saleId));
    await tx.delete(salesTable).where(eq(salesTable.id, saleId));
  });

  return sale;
}

router.delete("/sales/:id", async (req, res) => {
  try {
    const id = parseInt(req.params["id"] ?? "0", 10);
    if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
    const managerId = res.locals.user?.managerId ?? null;
    const deleted = await deleteSaleById(id, managerId);
    if (!deleted) { res.status(404).json({ error: "Sale not found" }); return; }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete sale");
    res.status(500).json({ error: "Failed to delete sale" });
  }
});

router.post("/sales/bulk-delete", async (req, res) => {
  try {
    const schema = z.object({
      ids: z.array(z.number().int().positive()).nullable().optional(),
      deleteAll: z.boolean().nullable().optional(),
    });
    const body = schema.parse(req.body);
    const managerId = res.locals.user?.managerId ?? null;

    let saleIds: number[];
    if (body.deleteAll) {
      const condition = managerId !== null ? eq(salesTable.managerId, managerId) : undefined;
      const all = await db.select({ id: salesTable.id }).from(salesTable).where(condition);
      saleIds = all.map((s) => s.id);
    } else if (body.ids && body.ids.length > 0) {
      saleIds = body.ids;
    } else {
      res.json({ deleted: 0 }); return;
    }

    for (const id of saleIds) {
      await deleteSaleById(id, managerId);
    }

    res.json({ deleted: saleIds.length });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.issues }); return;
    }
    req.log.error({ err }, "Failed to bulk delete sales");
    res.status(500).json({ error: "Failed to bulk delete sales" });
  }
});

router.get("/products/barcode/:barcode", async (req, res) => {
  try {
    const barcode = req.params["barcode"];
    if (!barcode) {
      res.status(400).json({ error: "Barcode required" });
      return;
    }
    const managerId = res.locals.user?.managerId;
    const condition = managerId !== undefined
      ? and(eq(productsTable.barcode, barcode), eq(productsTable.managerId, managerId))
      : eq(productsTable.barcode, barcode);

    const [product] = await db
      .select()
      .from(productsTable)
      .where(condition)
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
