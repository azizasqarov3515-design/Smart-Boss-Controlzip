import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import salesRouter from "./sales";
import authRouter from "./auth";
import backupRouter from "./backup";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);

router.use(requireAuth);

router.use(salesRouter);
router.use(productsRouter);
router.use(backupRouter);

export default router;
