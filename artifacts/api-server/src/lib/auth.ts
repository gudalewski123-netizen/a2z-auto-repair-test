import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

// Renamed for consistency with render.yaml's auto-generated env vars:
// SESSION_SECRET (was JWT_SECRET) and ADMIN_PASSWORD (was ADMIN_API_KEY).
const SESSION_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET;
if (!SESSION_SECRET) throw new Error("SESSION_SECRET env var is required");

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || process.env.ADMIN_API_KEY;
if (!ADMIN_PASSWORD) {
  console.warn("⚠ ADMIN_PASSWORD env var is not set — admin routes will be unreachable until you set it.");
}

export interface JwtPayload {
  userId: number;
  email: string;
  businessName: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SESSION_SECRET!, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SESSION_SECRET!) as JwtPayload;
}

// User auth (client portal) — JWT in httpOnly cookie
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

// Admin auth — single password sent as Bearer token (or X-Admin-Key for legacy).
// The admin dashboard prompts for ADMIN_PASSWORD on first visit, stores it in
// localStorage, then sends it on every protected request.
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!ADMIN_PASSWORD) {
    res.status(503).json({ error: "Admin auth not configured" });
    return;
  }
  const bearer = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const legacy = req.headers["x-admin-api-key"] as string | undefined;
  const key = bearer || legacy;
  if (!key || key !== ADMIN_PASSWORD) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}
