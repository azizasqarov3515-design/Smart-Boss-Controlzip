import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { workersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const SESSION_SECRET = process.env["SESSION_SECRET"] ?? "smartboss-dev-secret-change-in-prod";
const TOKEN_TTL_S = 30 * 24 * 60 * 60;

const revokedTokens = new Set<string>();

function b64url(str: string): string {
  return Buffer.from(str, "utf8").toString("base64url");
}

function b64urlDecode(str: string): string {
  return Buffer.from(str, "base64url").toString("utf8");
}

function hmac(data: string): string {
  return crypto.createHmac("sha256", SESSION_SECRET).update(data).digest("base64url");
}

export interface TokenPayload {
  sub: string;
  role: "manager" | "worker";
  name: string;
  managerId?: number;
  workerId?: number;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Locals {
      user: TokenPayload;
    }
  }
}

export function generateToken(payload: Omit<TokenPayload, "iat" | "exp">): string {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(
    JSON.stringify({
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_S,
    })
  );
  const sig = hmac(`${header}.${body}`);
  return `${header}.${body}.${sig}`;
}

export function validateToken(token: string): boolean {
  if (revokedTokens.has(token)) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [header, payload, sig] = parts as [string, string, string];

  const expected = hmac(`${header}.${payload}`);
  let sigBuf: Buffer, expBuf: Buffer;
  try {
    sigBuf = Buffer.from(sig, "base64url");
    expBuf = Buffer.from(expected, "base64url");
  } catch {
    return false;
  }
  if (sigBuf.length !== expBuf.length) return false;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return false;

  try {
    const data = JSON.parse(b64urlDecode(payload)) as { exp?: number };
    if (!data.exp || Math.floor(Date.now() / 1000) > data.exp) return false;
  } catch {
    return false;
  }

  return true;
}

export function getTokenPayload(token: string): TokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(b64urlDecode(parts[1]!)) as TokenPayload;
  } catch {
    return null;
  }
}

export function revokeToken(token: string): void {
  revokedTokens.add(token);
  if (revokedTokens.size > 10_000) {
    const first = revokedTokens.values().next().value;
    if (first !== undefined) revokedTokens.delete(first);
  }
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
  const payload = getTokenPayload(token);
  if (!payload) {
    res.status(401).json({ error: "Noto'g'ri token" });
    return;
  }
  res.locals.user = payload;

  if (payload.role === "worker" && payload.workerId) {
    db.update(workersTable)
      .set({ isOnline: true, lastSeen: new Date() })
      .where(eq(workersTable.id, payload.workerId))
      .catch(() => {});
  }

  next();
}

export function requireManager(req: Request, res: Response, next: NextFunction): void {
  if (res.locals.user?.role !== "manager") {
    res.status(403).json({ error: "Faqat rahbar uchun ruxsat etiladi" });
    return;
  }
  next();
}
