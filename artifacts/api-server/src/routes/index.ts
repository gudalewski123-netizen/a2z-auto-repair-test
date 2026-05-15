import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import portalRouter from "./portal";
import adminRouter from "./admin";
import leadsRouter from "./leads";
import voiceRouter from "./voice";
import smsRouter from "./sms";
// CRM routes — every endpoint in these files calls req.userId! so they're
// gated behind requireAuth. Previously these existed on disk but were not
// mounted, so the dashboard UI was 404ing on every API call.
import contactsRouter from "./contacts";
import jobsRouter from "./jobs";
import activitiesRouter from "./activities";
import followupsRouter from "./followups";
import dashboardRouter from "./dashboard";
import siteChangesRouter from "./site-changes";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(portalRouter);
router.use(adminRouter);
router.use(leadsRouter);
router.use(voiceRouter);
router.use(smsRouter);

// Portal-user-scoped CRM endpoints. requireAuth populates req.userId from
// the auth cookie. Routes assume req.userId is non-null (req.userId!) so
// the middleware MUST run before them.
router.use(requireAuth, contactsRouter);
router.use(requireAuth, jobsRouter);
router.use(requireAuth, activitiesRouter);
router.use(requireAuth, followupsRouter);
router.use(requireAuth, dashboardRouter);
router.use(requireAuth, siteChangesRouter);

export default router;
