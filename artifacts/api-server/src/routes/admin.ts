import crypto from "crypto";
import { db } from "@workspace/db";
import {
  managersTable,
  auditLogsTable,
  workersTable,
  salesTable,
} from "@workspace/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import type { Request, Response, NextFunction } from "express";

const router = Router();

const SESSION_SECRET = process.env["SESSION_SECRET"] ?? "smartboss-dev-secret-change-in-prod";
const ADMIN_PASSWORD = process.env["ADMIN_PASSWORD"] ?? "";
const ADMIN_TOKEN_TTL = 12 * 60 * 60; // 12 hours

function b64url(str: string): string {
  return Buffer.from(str, "utf8").toString("base64url");
}
function b64urlDecode(str: string): string {
  return Buffer.from(str, "base64url").toString("utf8");
}
function hmac(data: string): string {
  return crypto.createHmac("sha256", SESSION_SECRET + ":admin").update(data).digest("base64url");
}

function generateAdminToken(): string {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({
    sub: "admin",
    isAdmin: true,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + ADMIN_TOKEN_TTL,
  }));
  const sig = hmac(`${header}.${payload}`);
  return `${header}.${payload}.${sig}`;
}

function validateAdminToken(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [header, payload, sig] = parts as [string, string, string];
  const expected = hmac(`${header}.${payload}`);
  try {
    const sigBuf = Buffer.from(sig, "base64url");
    const expBuf = Buffer.from(expected, "base64url");
    if (sigBuf.length !== expBuf.length) return false;
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return false;
    const data = JSON.parse(b64urlDecode(payload)) as { exp?: number; isAdmin?: boolean };
    if (!data.isAdmin) return false;
    if (!data.exp || Math.floor(Date.now() / 1000) > data.exp) return false;
    return true;
  } catch {
    return false;
  }
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function encryptValue(text: string): string {
  const key = crypto.scryptSync(SESSION_SECRET, "smartboss-enc-salt-v1", 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const enc = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return iv.toString("hex") + ":" + enc.toString("hex");
}

function decryptValue(encrypted: string): string {
  const [ivHex, encHex] = encrypted.split(":");
  if (!ivHex || !encHex) throw new Error("Invalid");
  const key = crypto.scryptSync(SESSION_SECRET, "smartboss-enc-salt-v1", 32);
  const iv = Buffer.from(ivHex, "hex");
  const enc = Buffer.from(encHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers["authorization"];
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Admin avtorizatsiyasi talab etiladi" });
    return;
  }
  const token = auth.slice(7).trim();
  if (!validateAdminToken(token)) {
    res.status(401).json({ error: "Admin token noto'g'ri yoki muddati o'tgan" });
    return;
  }
  next();
}

function subscriptionDaysLeft(end: Date | null): number | null {
  if (!end) return null;
  const diff = end.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function planLabel(plan: string | null): string {
  switch (plan) {
    case "1m": return "1 oylik";
    case "3m": return "3 oylik";
    case "6m": return "6 oylik";
    case "1y": return "1 yillik";
    default: return "Yo'q";
  }
}

// POST /api/admin/login
router.post("/admin/login", (req, res) => {
  const { password } = req.body as { password?: string };
  if (!ADMIN_PASSWORD) {
    res.status(503).json({ error: "ADMIN_PASSWORD konfiguratsiya qilinmagan" });
    return;
  }
  if (!password || password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Parol noto'g'ri" });
    return;
  }
  const token = generateAdminToken();
  res.json({ token });
});

// GET /api/admin/managers
router.get("/admin/managers", requireAdmin, async (req, res) => {
  try {
    const managers = await db
      .select({
        id: managersTable.id,
        fullName: managersTable.fullName,
        phone: managersTable.phone,
        storeName: managersTable.storeName,
        storeAddress: managersTable.storeAddress,
        storeId: managersTable.storeId,
        login: managersTable.login,
        encryptedPassword: managersTable.encryptedPassword,
        subscriptionPlan: managersTable.subscriptionPlan,
        subscriptionEnd: managersTable.subscriptionEnd,
        subscriptionActive: managersTable.subscriptionActive,
        createdAt: managersTable.createdAt,
      })
      .from(managersTable)
      .orderBy(desc(managersTable.createdAt));

    const result = await Promise.all(
      managers.map(async (m) => {
        const [workerCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(workersTable)
          .where(eq(workersTable.managerId, m.id));
        const [salesCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(salesTable)
          .where(eq(salesTable.managerId, m.id));

        let password: string | null = null;
        if (m.encryptedPassword) {
          try { password = decryptValue(m.encryptedPassword); } catch { /* ignore */ }
        }

        const daysLeft = subscriptionDaysLeft(m.subscriptionEnd);

        return {
          id: m.id,
          fullName: m.fullName,
          phone: m.phone,
          storeName: m.storeName,
          storeAddress: m.storeAddress,
          storeId: m.storeId,
          login: m.login,
          password,
          subscriptionPlan: m.subscriptionPlan,
          subscriptionPlanLabel: planLabel(m.subscriptionPlan),
          subscriptionEnd: m.subscriptionEnd,
          subscriptionActive: m.subscriptionActive,
          subscriptionDaysLeft: daysLeft,
          createdAt: m.createdAt,
          workerCount: workerCount?.count ?? 0,
          salesCount: salesCount?.count ?? 0,
        };
      })
    );

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Admin get managers failed");
    res.status(500).json({ error: "Ma'lumotlarni olishda xato" });
  }
});

// GET /api/admin/managers/:id
router.get("/admin/managers/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id ?? "");
  if (isNaN(id)) { res.status(400).json({ error: "Noto'g'ri ID" }); return; }
  try {
    const [manager] = await db
      .select()
      .from(managersTable)
      .where(eq(managersTable.id, id));
    if (!manager) { res.status(404).json({ error: "Rahbar topilmadi" }); return; }

    const logs = await db
      .select()
      .from(auditLogsTable)
      .where(eq(auditLogsTable.managerId, id))
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(20);

    let password: string | null = null;
    if (manager.encryptedPassword) {
      try { password = decryptValue(manager.encryptedPassword); } catch { /* ignore */ }
    }

    res.json({
      ...manager,
      password,
      subscriptionPlanLabel: planLabel(manager.subscriptionPlan),
      subscriptionDaysLeft: subscriptionDaysLeft(manager.subscriptionEnd),
      auditLogs: logs,
    });
  } catch (err) {
    req.log.error({ err }, "Admin get manager failed");
    res.status(500).json({ error: "Xato" });
  }
});

// PUT /api/admin/managers/:id/subscription
const subscriptionSchema = z.object({
  plan: z.enum(["1m", "3m", "6m", "1y"]),
  active: z.boolean().optional().default(true),
  startFromNow: z.boolean().optional().default(true),
});

router.put("/admin/managers/:id/subscription", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id ?? "");
  if (isNaN(id)) { res.status(400).json({ error: "Noto'g'ri ID" }); return; }
  try {
    const body = subscriptionSchema.parse(req.body);

    const planDays: Record<string, number> = { "1m": 30, "3m": 90, "6m": 180, "1y": 365 };
    const days = planDays[body.plan] ?? 30;

    const [existing] = await db
      .select({ subscriptionEnd: managersTable.subscriptionEnd, subscriptionActive: managersTable.subscriptionActive })
      .from(managersTable)
      .where(eq(managersTable.id, id));

    let startDate = new Date();
    // If subscription still active and not expired, extend from current end
    if (!body.startFromNow && existing?.subscriptionEnd && existing.subscriptionEnd > new Date()) {
      startDate = existing.subscriptionEnd;
    }

    const subscriptionEnd = new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000);

    const [updated] = await db
      .update(managersTable)
      .set({
        subscriptionPlan: body.plan,
        subscriptionEnd,
        subscriptionActive: body.active,
      })
      .where(eq(managersTable.id, id))
      .returning({ id: managersTable.id, storeName: managersTable.storeName });

    if (!updated) { res.status(404).json({ error: "Rahbar topilmadi" }); return; }

    await db.insert(auditLogsTable).values({
      managerId: id,
      action: "subscription_changed",
      details: `Plan: ${body.plan} (${planLabel(body.plan)}), tugash: ${subscriptionEnd.toISOString().slice(0, 10)}, faol: ${body.active}`,
    });

    req.log.info({ managerId: id, plan: body.plan, subscriptionEnd }, "Subscription updated by admin");
    res.json({ ok: true, subscriptionEnd, subscriptionPlan: body.plan, subscriptionActive: body.active });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.issues[0]?.message ?? "Noto'g'ri ma'lumot" });
    } else {
      req.log.error({ err }, "Admin set subscription failed");
      res.status(500).json({ error: "Xato" });
    }
  }
});

// POST /api/admin/managers/:id/temp-credentials — set temporary login + password
const tempCredSchema = z.object({
  login: z.string().regex(/^[A-Z0-9]{8}$/, "Login: 8 ta katta harf va raqam"),
  password: z.string().regex(/^\d{6}$/, "Parol: 6 ta raqam"),
});

router.post("/admin/managers/:id/temp-credentials", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id ?? "");
  if (isNaN(id)) { res.status(400).json({ error: "Noto'g'ri ID" }); return; }
  try {
    const body = tempCredSchema.parse(req.body);

    // Check login uniqueness (not taken by another manager)
    const [existing] = await db
      .select({ id: managersTable.id })
      .from(managersTable)
      .where(eq(managersTable.login, body.login));
    if (existing && existing.id !== id) {
      res.status(409).json({ error: "Bu login boshqa rahbar tomonidan band" });
      return;
    }

    const passwordHash = hashPassword(body.password);
    const encryptedPassword = encryptValue(body.password);

    const [updated] = await db
      .update(managersTable)
      .set({ login: body.login, passwordHash, encryptedPassword })
      .where(eq(managersTable.id, id))
      .returning({ id: managersTable.id, storeName: managersTable.storeName });

    if (!updated) { res.status(404).json({ error: "Rahbar topilmadi" }); return; }

    await db.insert(auditLogsTable).values({
      managerId: id,
      action: "temp_credentials_set",
      details: `Admin tomonidan vaqtinchalik login: ${body.login} belgilandi`,
    });

    req.log.info({ managerId: id, newLogin: body.login }, "Temp credentials set by admin");
    res.json({ ok: true, login: body.login });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.issues[0]?.message ?? "Noto'g'ri ma'lumot" });
    } else {
      req.log.error({ err }, "Admin set temp credentials failed");
      res.status(500).json({ error: "Xato" });
    }
  }
});

// GET /api/admin/audit-logs
router.get("/admin/audit-logs", requireAdmin, async (req, res) => {
  try {
    const logs = await db
      .select({
        id: auditLogsTable.id,
        managerId: auditLogsTable.managerId,
        action: auditLogsTable.action,
        details: auditLogsTable.details,
        createdAt: auditLogsTable.createdAt,
        storeName: managersTable.storeName,
        storeId: managersTable.storeId,
      })
      .from(auditLogsTable)
      .leftJoin(managersTable, eq(auditLogsTable.managerId, managersTable.id))
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(100);
    res.json(logs);
  } catch (err) {
    req.log.error({ err }, "Admin get audit logs failed");
    res.status(500).json({ error: "Xato" });
  }
});

// DELETE /api/admin/managers/:id/subscription — deactivate subscription
router.delete("/admin/managers/:id/subscription", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id ?? "");
  if (isNaN(id)) { res.status(400).json({ error: "Noto'g'ri ID" }); return; }
  try {
    await db
      .update(managersTable)
      .set({ subscriptionActive: false })
      .where(eq(managersTable.id, id));
    await db.insert(auditLogsTable).values({
      managerId: id,
      action: "subscription_changed",
      details: "Admin tomonidan obuna o'chirildi",
    });
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Admin deactivate subscription failed");
    res.status(500).json({ error: "Xato" });
  }
});

export default router;
