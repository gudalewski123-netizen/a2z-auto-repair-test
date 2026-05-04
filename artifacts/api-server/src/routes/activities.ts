import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, activitiesTable, contactsTable } from "@workspace/db";
import {
  ListActivitiesParams,
  ListActivitiesResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/contacts/:contactId/activities", async (req, res): Promise<void> => {
  const params = ListActivitiesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

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
    .where(eq(activitiesTable.contactId, params.data.contactId))
    .orderBy(activitiesTable.createdAt);

  res.json(ListActivitiesResponse.parse(activities));
});

export default router;
