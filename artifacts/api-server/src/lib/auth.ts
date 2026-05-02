import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";

const tokens = new Map<string, number>();

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function generateToken(): string {
  const token = crypto.randomBytes(32).toString("hex");
  tokens.set(token, Date.now() + TOKEN_TTL_MS);
  return token;
}

export function validateToken(token: string): boolean {
  const expiry = tokens.get(token);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    tokens.delete(token);
    return false;
  }
  return true;
}

export function revokeToken(token: string): void {
  tokens.delete(token);
}

export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7).trim() || null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req.headers["authorization"]);
  if (!token || !validateToken(token)) {
    res.status(401).json({ error: "Avtorizatsiya talab etiladi" });
    return;
  }
  next();
}
