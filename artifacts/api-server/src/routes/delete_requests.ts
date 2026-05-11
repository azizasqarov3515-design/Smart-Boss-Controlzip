import { db } from "@workspace/db";
import { deleteRequestsTable, salesTable, saleItemsTable, productsTable, customersTable } from "@workspace/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
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

const createCustomerDeleteRequestSchema = z.object({
  customerIds: z.array(z.number().int().positive()).min(1),
  customerNames: z.array(z.string()).min(1),
});

function parseRequest(r: typeof deleteRequestsTable.$inferSelect) {
  return {
    ...r,
    type: r.type ?? "sale",
    saleIds: JSON.parse(r.saleIds) as number[],
    productIds: r.productIds ? (JSON.parse(r.productIds) as number[]) : null,
    productNames: r.productNames ? (JSON.parse(r.productNames) as string[]) : null,
    customerIds: r.customerIds ? (JSON.parse(r.customerIds) as number[]) : null,
    customerNames: r.customerNames ? (JSON.parse(r.customerNames) as string[]) : null,
    createdAt: r.createdAt.toISOString(),
  };
}

router.post("/delete-requests/customer", async (req, res) => {
  try {
    const user = res.locals.user;
    const body = createCustomerDeleteRequestSchema.parse(req.body);
    const managerId = user.managerId ?? null;

    const [request] = await db
      .insert(deleteRequestsTable)
      .values({
        managerId,
        type: "customer",
        saleIds: "[]",
        customerIds: JSON.stringify(body.customerIds),
        customerNames: JSON.stringify(body.customerNames),
        workerId: user.workerId ?? null,
        workerName: user.name ?? "Noma'lum",
        status: "pending",
      })
      .returning();

    req.log.info({ requestId: request?.id, workerName: user.name }, "Customer delete request created");
    res.status(201).json({ id: request?.id, status: "pending" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Noto'g'ri ma'lumot" });
    } else {
      req.log.error({ err }, "Failed to create customer delete request");
      res.status(500).json({ error: "So'rov yuborishda xato" });
    }
  }
});

router.post("/delete-requests/product", async (req, res) => {
  try {
    const user = res.locals.user;
    const body = createProductDeleteRequestSchema.parse(req.body);
    const managerId = user.managerId ?? null;

    const [request] = await db
      .insert(deleteRequestsTable)
      .values({
        managerId,
        type: "product",
        saleIds: "[]",
        productIds: JSON.stringify(body.productIds),
        productNames: JSON.stringify(body.productNames),
        workerId: user.workerId ?? null,
        workerName: user.name ?? "Noma'lum",
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
    const managerId = user.managerId ?? null;

    const [request] = await db
      .insert(deleteRequestsTable)
      .values({
        managerId,
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
    const managerId = res.locals.user?.managerId;
    const condition = managerId !== undefined
      ? and(eq(deleteRequestsTable.status, "pending"), eq(deleteRequestsTable.managerId, managerId))
      : eq(deleteRequestsTable.status, "pending");

    const requests = await db
      .select()
      .from(deleteRequestsTable)
      .where(condition)
      .orderBy(deleteRequestsTable.createdAt);

    res.json(requests.map(parseRequest));
  } catch (err) {
    req.log.error({ err }, "Failed to get delete requests");
    res.status(500).json({ error: "So'rovlarni olishda xato" });
  }
});

router.get("/delete-requests/worker", async (req, res) => {
  try {
    const user = res.locals.user;
    const workerId = user?.workerId;
    if (!workerId) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }

    const requests = await db
      .select()
      .from(deleteRequestsTable)
      .where(eq(deleteRequestsTable.workerId, workerId))
      .orderBy(deleteRequestsTable.createdAt);

    res.json(requests.map(parseRequest));
  } catch (err) {
    req.log.error({ err }, "Failed to get worker delete requests");
    res.status(500).json({ error: "So'rovlarni olishda xato" });
  }
});

router.post("/delete-requests/:id/approve", requireManager, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) { res.status(400).json({ error: "Noto'g'ri ID" }); return; }

    const managerId = res.locals.user?.managerId;
    const condition = managerId !== undefined
      ? and(eq(deleteRequestsTable.id, id), eq(deleteRequestsTable.managerId, managerId))
      : eq(deleteRequestsTable.id, id);

    const [request] = await db
      .select()
      .from(deleteRequestsTable)
      .where(condition);

    if (!request || request.status !== "pending") {
      res.status(404).json({ error: "So'rov topilmadi" });
      return;
    }

    if (request.type === "product") {
      if (request.productIds) {
        const productIds = JSON.parse(request.productIds) as number[];
        if (productIds.length > 0) {
          await db.delete(productsTable).where(inArray(productsTable.id, productIds));
        }
      }
    } else if (request.type === "customer") {
      if (request.customerIds) {
        const customerIds = JSON.parse(request.customerIds) as number[];
        if (customerIds.length > 0) {
          await db.delete(customersTable).where(inArray(customersTable.id, customerIds));
        }
      }
    } else {
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

    const managerId = res.locals.user?.managerId;
    const condition = managerId !== undefined
      ? and(eq(deleteRequestsTable.id, id), eq(deleteRequestsTable.managerId, managerId))
      : eq(deleteRequestsTable.id, id);

    const [request] = await db
      .update(deleteRequestsTable)
      .set({ status: "rejected" })
      .where(condition)
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
