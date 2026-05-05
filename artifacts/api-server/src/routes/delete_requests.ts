import { db } from "@workspace/db";
import { deleteRequestsTable, salesTable, saleItemsTable, productsTable } from "@workspace/db/schema";
import { eq, inArray, sql } from "drizzle-orm";
import { Router } from "express";
import { requireManager } from "../lib/auth";
import { z } from "zod";

const router = Router();

const createDeleteRequestSchema = z.object({
  saleIds: z.array(z.number().int().positive()).min(1),
});

const createProductDeleteRequestSchema = z.object({
  productIds: z.array(z.number().int().positive()).min(1),
  productNames: z.array(z.string()).min(1),
});

router.post("/delete-requests/product", async (req, res) => {
  try {
    const user = res.locals.user;
    const body = createProductDeleteRequestSchema.parse(req.body);

    const [request] = await db
      .insert(deleteRequestsTable)
      .values({
        type: "product",
        saleIds: "[]",
        productIds: JSON.stringify(body.productIds),
        productNames: JSON.stringify(body.productNames),
        workerId: user.workerId ?? null,
        workerName: user.name ?? user.username ?? "Noma'lum",
        status: "pending",
      })
      .returning();

    req.log.info({ requestId: request?.id, workerName: user.name }, "Product delete request created");
    res.status(201).json({ id: request?.id, status: "pending" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Noto'g'ri ma'lumot" });
    } else {
      req.log.error({ err }, "Failed to create product delete request");
      res.status(500).json({ error: "So'rov yuborishda xato" });
    }
  }
});

router.post("/delete-requests", async (req, res) => {
  try {
    const user = res.locals.user;
    const body = createDeleteRequestSchema.parse(req.body);

    const [request] = await db
      .insert(deleteRequestsTable)
      .values({
        type: "sale",
        saleIds: JSON.stringify(body.saleIds),
        workerId: user.workerId ?? null,
        workerName: user.name,
        status: "pending",
      })
      .returning();

    req.log.info({ requestId: request?.id, workerName: user.name }, "Delete request created");
    res.status(201).json({ id: request?.id, status: "pending" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Noto'g'ri ma'lumot" });
    } else {
      req.log.error({ err }, "Failed to create delete request");
      res.status(500).json({ error: "So'rov yuborishda xato" });
    }
  }
});

router.get("/delete-requests", requireManager, async (req, res) => {
  try {
    const requests = await db
      .select()
      .from(deleteRequestsTable)
      .where(eq(deleteRequestsTable.status, "pending"))
      .orderBy(deleteRequestsTable.createdAt);

    res.json(
      requests.map((r) => ({
        ...r,
        type: r.type ?? "sale",
        saleIds: JSON.parse(r.saleIds) as number[],
        productIds: r.productIds ? (JSON.parse(r.productIds) as number[]) : null,
        productNames: r.productNames ? (JSON.parse(r.productNames) as string[]) : null,
        createdAt: r.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to get delete requests");
    res.status(500).json({ error: "So'rovlarni olishda xato" });
  }
});

router.post("/delete-requests/:id/approve", requireManager, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) { res.status(400).json({ error: "Noto'g'ri ID" }); return; }

    const [request] = await db
      .select()
      .from(deleteRequestsTable)
      .where(eq(deleteRequestsTable.id, id));

    if (!request || request.status !== "pending") {
      res.status(404).json({ error: "So'rov topilmadi" });
      return;
    }

    if (request.type === "product") {
      // Handle product delete request
      if (request.productIds) {
        const productIds = JSON.parse(request.productIds) as number[];
        if (productIds.length > 0) {
          await db.delete(productsTable).where(inArray(productsTable.id, productIds));
        }
      }
    } else {
      // Handle sale delete request (original logic)
      const saleIds = JSON.parse(request.saleIds) as number[];
      if (saleIds.length > 0) {
        for (const saleId of saleIds) {
          const items = await db
            .select()
            .from(saleItemsTable)
            .where(eq(saleItemsTable.saleId, saleId));

          for (const item of items) {
            if (item.productId) {
              await db
                .update(productsTable)
                .set({ quantity: sql`${productsTable.quantity} + ${item.quantity}` })
                .where(eq(productsTable.id, item.productId));
            }
          }
        }
        await db.delete(salesTable).where(inArray(salesTable.id, saleIds));
      }
    }

    await db
      .update(deleteRequestsTable)
      .set({ status: "approved" })
      .where(eq(deleteRequestsTable.id, id));

    req.log.info({ requestId: id, type: request.type }, "Delete request approved");
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to approve delete request");
    res.status(500).json({ error: "Tasdiqlashda xato" });
  }
});

router.post("/delete-requests/:id/reject", requireManager, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) { res.status(400).json({ error: "Noto'g'ri ID" }); return; }

    const [request] = await db
      .update(deleteRequestsTable)
      .set({ status: "rejected" })
      .where(eq(deleteRequestsTable.id, id))
      .returning();

    if (!request) { res.status(404).json({ error: "So'rov topilmadi" }); return; }
    req.log.info({ requestId: id }, "Delete request rejected");
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to reject delete request");
    res.status(500).json({ error: "Rad etishda xato" });
  }
});

export default router;
