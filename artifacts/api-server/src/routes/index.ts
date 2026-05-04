import { Router, type IRouter } from "express";
import healthRouter from "./health";
import contactsRouter from "./contacts";
import jobsRouter from "./jobs";
import activitiesRouter from "./activities";
import followupsRouter from "./followups";
import dashboardRouter from "./dashboard";
import leadsRouter from "./leads";

const router: IRouter = Router();

router.use(healthRouter);
router.use(contactsRouter);
router.use(jobsRouter);
router.use(activitiesRouter);
router.use(followupsRouter);
router.use(dashboardRouter);
router.use(leadsRouter);

export default router;
