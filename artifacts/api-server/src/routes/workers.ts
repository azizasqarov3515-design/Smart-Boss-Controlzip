import { db } from "@workspace/db";
import { workersTable } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";
import { Router } from "express";
import { requireManager } from "../lib/auth";

const router = Router();

router.get("/workers", requireManager, async (req, res) => {
  try {
    const managerId = res.locals.user?.managerId;
    const condition = managerId !== undefined ? eq(workersTable.managerId, managerId) : undefined;

    const workers = await db
      .select({
        id: workersTable.id,
        name: workersTable.name,
        address: workersTable.address,
        phone: workersTable.phone,
        status: workersTable.status,
        createdAt: workersTable.createdAt,
      })
      .from(workersTable)
      .where(condition)
      .orderBy(workersTable.createdAt);

    res.json(workers.map((w) => ({ ...w, createdAt: w.createdAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Failed to get workers");
    res.status(500).json({ error: "Ishchilarni olishda xato" });
  }
});

router.post("/workers/:id/approve", requireManager, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) { res.status(400).json({ error: "Noto'g'ri ID" }); return; }

    const managerId = res.locals.user?.managerId;
    const condition = managerId !== undefined
      ? and(eq(workersTable.id, id), eq(workersTable.managerId, managerId))
      : eq(workersTable.id, id);

    const [worker] = await db
      .update(workersTable)
      .set({ status: "approved" })
      .where(condition)
      .returning();

    if (!worker) { res.status(404).json({ error: "Ishchi topilmadi" }); return; }
    req.log.info({ workerId: id }, "Worker approved");
    res.json({ id: worker.id, name: worker.name, status: worker.status });
  } catch (err) {
    req.log.error({ err }, "Failed to approve worker");
    res.status(500).json({ error: "Tasdiqlashda xato" });
  }
});

router.post("/workers/:id/reject", requireManager, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) { res.status(400).json({ error: "Noto'g'ri ID" }); return; }

    const managerId = res.locals.user?.managerId;
    const condition = managerId !== undefined
      ? and(eq(workersTable.id, id), eq(workersTable.managerId, managerId))
      : eq(workersTable.id, id);

    const [worker] = await db
      .update(workersTable)
      .set({ status: "rejected" })
      .where(condition)
      .returning();

    if (!worker) { res.status(404).json({ error: "Ishchi topilmadi" }); return; }
    req.log.info({ workerId: id }, "Worker rejected");
    res.json({ id: worker.id, name: worker.name, status: worker.status });
  } catch (err) {
    req.log.error({ err }, "Failed to reject worker");
    res.status(500).json({ error: "Rad etishda xato" });
  }
});

router.delete("/workers/:id", requireManager, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) { res.status(400).json({ error: "Noto'g'ri ID" }); return; }

    const managerId = res.locals.user?.managerId;
    const condition = managerId !== undefined
      ? and(eq(workersTable.id, id), eq(workersTable.managerId, managerId))
      : eq(workersTable.id, id);

    const [worker] = await db
      .delete(workersTable)
      .where(condition)
      .returning();

    if (!worker) { res.status(404).json({ error: "Ishchi topilmadi" }); return; }
    req.log.info({ workerId: id }, "Worker deleted");
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete worker");
    res.status(500).json({ error: "Ishchini o'chirishda xato" });
  }
});

export default router;
