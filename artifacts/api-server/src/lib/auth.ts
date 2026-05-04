import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";

const SESSION_SECRET = process.env["SESSION_SECRET"] ?? "smartboss-dev-secret-change-in-prod";
const TOKEN_TTL_S = 30 * 24 * 60 * 60; // 30 days

// Small in-memory blocklist for explicit logouts.
// Losing it on restart is acceptable — client-side token is cleared on logout
// and valid JWTs keep working after restart (that's the whole point of JWTs).
const revokedTokens = new Set<string>();

// ── JWT helpers ──────────────────────────────────────────────────────────────

function b64url(str: string): string {
  return Buffer.from(str, "utf8").toString("base64url");
}

function b64urlDecode(str: string): string {
  return Buffer.from(str, "base64url").toString("utf8");
}

function hmac(data: string): string {
  return crypto.createHmac("sha256", SESSION_SECRET).update(data).digest("base64url");
}

// ── Public API ───────────────────────────────────────────────────────────────

export function generateToken(): string {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({
      sub: "admin",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_S,
    })
  );
  const sig = hmac(`${header}.${payload}`);
  return `${header}.${payload}.${sig}`;
}

export function validateToken(token: string): boolean {
  if (revokedTokens.has(token)) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [header, payload, sig] = parts as [string, string, string];

  // Verify signature (timing-safe comparison)
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

  // Verify expiry
  try {
    const data = JSON.parse(b64urlDecode(payload)) as { exp?: number };
    if (!data.exp || Math.floor(Date.now() / 1000) > data.exp) return false;
  } catch {
    return false;
  }

  return true;
}

export function revokeToken(token: string): void {
  revokedTokens.add(token);
  // Trim blocklist to avoid unbounded growth
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
  next();
}
