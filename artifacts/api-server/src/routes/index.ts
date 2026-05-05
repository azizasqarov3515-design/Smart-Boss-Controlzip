import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { workersTable, managersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import healthRouter from "./health";
import productsRouter from "./products";
import salesRouter from "./sales";
import authRouter from "./auth";
import backupRouter from "./backup";
import customersRouter from "./customers";
import workersRouter from "./workers";
import deleteRequestsRouter from "./delete_requests";
import adminRouter from "./admin";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);

// Admin routes (have their own auth middleware inside)
router.use(adminRouter);

router.use(requireAuth);

// Subscription check for managers
const checkSubscription = async (req: Request, res: Response, next: NextFunction) => {
  const user = res.locals.user;
  if (user?.role !== "manager" || !user.managerId) { next(); return; }

  // Skip subscription check for backup and account deletion
  const skipPaths = ["/api/auth/logout", "/api/auth/me", "/api/auth/manager-account"];
  if (skipPaths.some((p) => req.path.startsWith(p.replace("/api", "")))) { next(); return; }

  try {
    const [manager] = await db
      .select({
        subscriptionActive: managersTable.subscriptionActive,
        subscriptionEnd: managersTable.subscriptionEnd,
      })
      .from(managersTable)
      .where(eq(managersTable.id, user.managerId));

    if (!manager) { next(); return; }

    const now = new Date();
    const isExpired = !manager.subscriptionActive ||
      (manager.subscriptionEnd !== null && manager.subscriptionEnd < now);

    if (isExpired) {
      res.status(402).json({
        error: "Obuna faol emas",
        code: "SUBSCRIPTION_REQUIRED",
        subscriptionActive: false,
      });
      return;
    }
  } catch {
    // DB error — allow through, don't block user
  }
  next();
};

const checkWorkerStatus = async (req: Request, res: Response, next: NextFunction) => {
  const user = res.locals.user;
  if (user?.role === "worker" && user.workerId) {
    try {
      const [worker] = await db
        .select({ status: workersTable.status, managerId: workersTable.managerId })
        .from(workersTable)
        .where(eq(workersTable.id, user.workerId));
      if (!worker) {
        res.status(401).json({ error: "Hisobingiz o'chirilgan. Qaytadan ro'yxatdan o'ting." });
        return;
      }
      if (worker.status !== "approved") {
        res.status(403).json({ error: "Ruxsat bekor qilindi. Rahbar tasdig'ini kuting." });
        return;
      }
      // Check manager subscription for worker
      if (worker.managerId) {
        const [manager] = await db
          .select({ subscriptionActive: managersTable.subscriptionActive, subscriptionEnd: managersTable.subscriptionEnd })
          .from(managersTable)
          .where(eq(managersTable.id, worker.managerId));
        if (manager) {
          const now = new Date();
          const isExpired = !manager.subscriptionActive ||
            (manager.subscriptionEnd !== null && manager.subscriptionEnd < now);
          if (isExpired) {
            res.status(402).json({
              error: "Obuna faol emas",
              code: "SUBSCRIPTION_REQUIRED",
              subscriptionActive: false,
            });
            return;
          }
        }
      }
    } catch {
      // DB error — allow through
    }
  }
  next();
};

router.use(checkSubscription);
router.use(checkWorkerStatus);

router.use(salesRouter);
router.use(productsRouter);
router.use(backupRouter);
router.use(customersRouter);
router.use(workersRouter);
router.use(deleteRequestsRouter);

export default router;
