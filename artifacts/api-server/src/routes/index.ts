import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import salesRouter from "./sales";

const router: IRouter = Router();

router.use(healthRouter);
router.use(salesRouter);
router.use(productsRouter);

export default router;
