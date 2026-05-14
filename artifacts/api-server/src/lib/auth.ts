import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db, adminUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";

const SESSION_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET;
if (!SESSION_SECRET) throw new Error("SESSION_SECRET (or JWT_SECRET) env var is required");

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || process.env.ADMIN_API_KEY;

export interface JwtPayload {
  userId: number;
  email: string;
  businessName: string;
}

export interface AdminSessionPayload {
  username: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SESSION_SECRET!, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SESSION_SECRET!) as JwtPayload;
}

export function signAdminSession(username: string): string {
  return jwt.sign({ username }, SESSION_SECRET!, { expiresIn: "7d" });
}

export function verifyAdminSession(token: string): AdminSessionPayload | null {
  try {
    const payload = jwt.verify(token, SESSION_SECRET!) as AdminSessionPayload;
    if (!payload || typeof payload.username !== "string") return null;
    return { username: payload.username };
  } catch {
    return null;
  }
}

export async function verifyAdminCredentials(username: string, password: string): Promise<boolean> {
  if (typeof username !== "string" || typeof password !== "string") return false;
  if (!username || !password) return false;

  const rows = await db.select().from(adminUsersTable).limit(1);
  const hasAnyAdmin = rows.length > 0;

  if (hasAnyAdmin) {
    const [match] = await db
      .select()
      .from(adminUsersTable)
      .where(eq(adminUsersTable.username, username))
      .limit(1);
    if (match && (await bcrypt.compare(password, match.passwordHash))) {
      return true;
    }
  } else {
    if (username === "Admin" && password === "Password") return true;
  }

  if (ADMIN_PASSWORD && password === ADMIN_PASSWORD) return true;

  return false;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.auth_token;
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const payload = verifyToken(token);
    (req as any).user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired session" });
  }
}

// Admin auth — Bearer token. Accepts either:
//   1. JWT issued by signAdminSession (preferred — used after /api/admin/login
//      with username + password)
//   2. Raw ADMIN_PASSWORD env var (back-compat / break-glass for the legacy
//      password-only flow)
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const bearer = authHeader && authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice("bearer ".length).trim()
    : "";
  const legacy = (req.headers["x-admin-api-key"] as string | undefined) ?? "";
  const token = bearer || legacy;

  if (token) {
    const payload = verifyAdminSession(token);
    if (payload) {
      (req as any).admin = { username: payload.username };
      next();
      return;
    }
    if (ADMIN_PASSWORD && token === ADMIN_PASSWORD) {
      (req as any).admin = { username: "legacy" };
      next();
      return;
    }
  }

  res.status(403).json({ error: "Forbidden" });
}
