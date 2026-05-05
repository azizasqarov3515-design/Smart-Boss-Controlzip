import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { workersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import healthRouter from "./health";
import productsRouter from "./products";
import salesRouter from "./sales";
import authRouter from "./auth";
import telegramRouter from "./telegram";
import backupRouter from "./backup";
import customersRouter from "./customers";
import workersRouter from "./workers";
import deleteRequestsRouter from "./delete_requests";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(telegramRouter);

router.use(requireAuth);

const checkWorkerStatus = async (req: Request, res: Response, next: NextFunction) => {
  const user = res.locals.user;
  if (user?.role === "worker" && user.workerId) {
    try {
      const [worker] = await db
        .select({ status: workersTable.status })
        .from(workersTable)
        .where(eq(workersTable.id, user.workerId));
      if (!worker) {
        // Worker deleted — 401 triggers client-side auto-logout
        res.status(401).json({ error: "Hisobingiz o'chirilgan. Qaytadan ro'yxatdan o'ting." });
        return;
      }
      if (worker.status !== "approved") {
        res.status(403).json({ error: "Ruxsat bekor qilindi. Rahbar tasdig'ini kuting." });
        return;
      }
    } catch {
      // DB error — allow through
    }
  }
  next();
};

router.use(checkWorkerStatus);

router.use(salesRouter);
router.use(productsRouter);
router.use(backupRouter);
router.use(customersRouter);
router.use(workersRouter);
router.use(deleteRequestsRouter);

export default router;
