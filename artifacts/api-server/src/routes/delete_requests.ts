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

router.post("/delete-requests", async (req, res) => {
  try {
    const user = res.locals.user;
    const body = createDeleteRequestSchema.parse(req.body);

    const [request] = await db
      .insert(deleteRequestsTable)
      .values({
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
        saleIds: JSON.parse(r.saleIds) as number[],
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

    await db
      .update(deleteRequestsTable)
      .set({ status: "approved" })
      .where(eq(deleteRequestsTable.id, id));

    req.log.info({ requestId: id, saleIds }, "Delete request approved");
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
