import { Router, type IRouter } from "express";
import healthRouter from "./health";
import bulletinsRouter from "./bulletins";
import templatesRouter from "./templates";

const router: IRouter = Router();

router.use(healthRouter);
router.use(bulletinsRouter);
router.use(templatesRouter);

export default router;
