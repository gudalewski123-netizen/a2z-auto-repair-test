import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import adminRouter from "./admin";
import contactsRouter from "./contacts";
import jobsRouter from "./jobs";
import activitiesRouter from "./activities";
import followupsRouter from "./followups";
import dashboardRouter from "./dashboard";
import leadsRouter from "./leads";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(adminRouter);
router.use(leadsRouter);

router.use(requireAuth);
router.use(contactsRouter);
router.use(jobsRouter);
router.use(activitiesRouter);
router.use(followupsRouter);
router.use(dashboardRouter);

export default router;
