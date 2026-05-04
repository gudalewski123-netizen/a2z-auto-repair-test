import { Router, type IRouter } from "express";
import { eq, sql, lt, and, desc } from "drizzle-orm";
import { db, contactsTable, jobsTable, activitiesTable, followUpsTable } from "@workspace/db";
import {
  GetDashboardSummaryResponse,
  GetPipelineSummaryResponse,
  GetRecentActivityQueryParams,
  GetRecentActivityResponse,
  GetSourceBreakdownResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const totalLeads = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contactsTable);

  const bookedJobs = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contactsTable)
    .where(eq(contactsTable.status, "booked"));

  const completedJobs = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contactsTable)
    .where(eq(contactsTable.status, "completed"));

  const lostLeads = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contactsTable)
    .where(eq(contactsTable.status, "lost"));

  const totalRevenue = await db
    .select({ total: sql<string>`COALESCE(SUM(${jobsTable.price}), 0)` })
    .from(jobsTable);

  const overdueFollowUps = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(followUpsTable)
    .where(and(lt(followUpsTable.dueDate, new Date()), eq(followUpsTable.status, "pending")));

  const total = totalLeads[0].count;
  const completed = completedJobs[0].count;
  const conversionRate = total > 0 ? Math.round((completed / total) * 10000) / 100 : 0;

  res.json(
    GetDashboardSummaryResponse.parse({
      totalLeads: total,
      bookedJobs: bookedJobs[0].count,
      completedJobs: completed,
      lostLeads: lostLeads[0].count,
      conversionRate,
      totalRevenue: Number(totalRevenue[0].total),
      overdueFollowUps: overdueFollowUps[0].count,
    })
  );
});

router.get("/dashboard/pipeline", async (_req, res): Promise<void> => {
  const pipeline = await db
    .select({
      status: contactsTable.status,
      count: sql<number>`count(*)::int`,
      revenue: sql<string>`COALESCE(SUM(${contactsTable.totalRevenue}::numeric), 0)`,
    })
    .from(contactsTable)
    .groupBy(contactsTable.status);

  const result = pipeline.map((p) => ({
    ...p,
    revenue: Number(p.revenue),
  }));

  res.json(GetPipelineSummaryResponse.parse(result));
});

router.get("/dashboard/recent-activity", async (req, res): Promise<void> => {
  const params = GetRecentActivityQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const limit = params.data.limit ?? 20;

  const activities = await db
    .select({
      id: activitiesTable.id,
      contactId: activitiesTable.contactId,
      contactName: contactsTable.name,
      action: activitiesTable.action,
      details: activitiesTable.details,
      createdAt: activitiesTable.createdAt,
    })
    .from(activitiesTable)
    .leftJoin(contactsTable, eq(activitiesTable.contactId, contactsTable.id))
    .orderBy(desc(activitiesTable.createdAt))
    .limit(limit);

  res.json(GetRecentActivityResponse.parse(activities));
});

router.get("/dashboard/source-breakdown", async (_req, res): Promise<void> => {
  const sources = await db
    .select({
      source: contactsTable.source,
      count: sql<number>`count(*)::int`,
    })
    .from(contactsTable)
    .groupBy(contactsTable.source);

  res.json(GetSourceBreakdownResponse.parse(sources));
});

export default router;
