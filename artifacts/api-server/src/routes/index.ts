import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import portalRouter from "./portal";
import adminRouter from "./admin";
import leadsRouter from "./leads";
import voiceRouter from "./voice";
import smsRouter from "./sms";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(portalRouter);
router.use(adminRouter);
router.use(leadsRouter);
router.use(voiceRouter);
router.use(smsRouter);

export default router;
