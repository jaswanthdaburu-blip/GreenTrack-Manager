import { Router, type IRouter } from "express";
import healthRouter from "./health";
import sessionRouter from "./session";
import greenTrackRouter from "./greentrack";

const router: IRouter = Router();

router.use(healthRouter);
router.use(sessionRouter);
router.use(greenTrackRouter);

export default router;
