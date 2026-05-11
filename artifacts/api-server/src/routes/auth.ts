import crypto from "crypto";
import { db } from "@workspace/db";
import {
  workersTable,
  managersTable,
  productsTable,
  salesTable,
  customersTable,
  deleteRequestsTable,
  auditLogsTable,
} from "@workspace/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { generateToken, revokeToken, extractBearerToken, requireAuth } from "../lib/auth";

const router = Router();

const SESSION_SECRET = process.env["SESSION_SECRET"] ?? "smartboss-dev-secret-change-in-prod";

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  try {
    const derived = crypto.scryptSync(password, salt, 64).toString("hex");
    if (hash.length !== derived.length) return false;
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(derived, "hex"));
  } catch {
    return false;
  }
}

function encryptValue(text: string): string {
  const key = crypto.scryptSync(SESSION_SECRET, "smartboss-enc-salt-v1", 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const enc = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return iv.toString("hex") + ":" + enc.toString("hex");
}

function subscriptionDaysLeft(end: Date | null): number | null {
  if (!end) return null;
  return Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function buildSubscriptionInfo(manager: {
  subscriptionPlan: string | null;
  subscriptionEnd: Date | null;
  subscriptionActive: boolean;
}) {
  const daysLeft = subscriptionDaysLeft(manager.subscriptionEnd);
  const isExpired = !manager.subscriptionActive ||
    (manager.subscriptionEnd !== null && manager.subscriptionEnd < new Date());
  return {
    subscriptionPlan: manager.subscriptionPlan,
    subscriptionEnd: manager.subscriptionEnd,
    subscriptionActive: manager.subscriptionActive,
    subscriptionDaysLeft: daysLeft,
    subscriptionExpired: isExpired,
  };
}

const managerRegisterSchema = z.object({
  fullName: z.string().trim().min(2, "Ism familiya kamida 2 ta harf"),
  address: z.string().trim().min(2, "Yashash joyi kiritilishi shart"),
  phone: z.string().trim().min(7, "Telefon raqami kiritilishi shart"),
  storeName: z.string().trim().min(2, "Do'kon nomi kiritilishi shart"),
  storeAddress: z.string().trim().min(2, "Do'kon manzili kiritilishi shart"),
  storeId: z
    .string()
    .regex(/^[A-Z]{2}\d{8}$/, "Do'kon ID: 2 katta harf + 8 raqam (masalan: AB12345678)"),
  login: z
    .string()
    .regex(/^[A-Z0-9]{8}$/, "Login 8 ta katta harf va raqamdan iborat bo'lishi kerak"),
  password: z
    .string()
    .regex(/^\d{6}$/, "Parol 6 ta raqamdan iborat bo'lishi kerak"),
});

const managerLoginSchema = z.object({
  login: z.string().min(1),
  password: z.string().min(1),
});

router.post("/auth/manager-register", async (req, res) => {
  try {
    const body = managerRegisterSchema.parse(req.body);

    const [existing] = await db
      .select({ id: managersTable.id })
      .from(managersTable)
      .where(eq(managersTable.login, body.login));

    if (existing) {
      res.status(409).json({ error: "Bu login allaqachon band. Boshqa login tanlang." });
      return;
    }

    const [existingStoreId] = await db
      .select({ id: managersTable.id })
      .from(managersTable)
      .where(eq(managersTable.storeId, body.storeId));

    if (existingStoreId) {
      res.status(409).json({ error: "Bu Do'kon ID allaqachon band. Boshqa ID tanlang." });
      return;
    }

    const passwordHash = hashPassword(body.password);
    const encryptedPassword = encryptValue(body.password);
    const [manager] = await db
      .insert(managersTable)
      .values({
        fullName: body.fullName,
        address: body.address,
        phone: body.phone,
        storeName: body.storeName,
        storeAddress: body.storeAddress,
        storeId: body.storeId,
        login: body.login,
        passwordHash,
        encryptedPassword,
      })
      .returning();

    req.log.info({ managerId: manager?.id, storeName: body.storeName }, "Manager registered");

    const token = generateToken({
      sub: `manager-${manager!.id}`,
      role: "manager",
      name: manager!.fullName,
      managerId: manager!.id,
    });

    res.status(201).json({
      id: manager?.id,
      storeName: manager?.storeName,
      storeAddress: manager?.storeAddress,
      storeId: manager?.storeId,
      token,
      role: "manager",
      name: manager?.fullName,
      managerId: manager?.id,
      login: manager?.login,
      phone: manager?.phone,
      ...buildSubscriptionInfo({
        subscriptionPlan: null,
        subscriptionEnd: null,
        subscriptionActive: false,
      }),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.issues[0]?.message ?? "Ma'lumotlar noto'g'ri kiritildi" });
    } else {
      req.log.error({ err }, "Manager registration failed");
      res.status(500).json({ error: "Ro'yxatdan o'tishda xato" });
    }
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const body = managerLoginSchema.parse(req.body);

    const [manager] = await db
      .select()
      .from(managersTable)
      .where(eq(managersTable.login, body.login));

    if (manager && verifyPassword(body.password, manager.passwordHash)) {
      const token = generateToken({
        sub: `manager-${manager.id}`,
        role: "manager",
        name: manager.fullName,
        managerId: manager.id,
      });
      req.log.info({ managerId: manager.id, storeName: manager.storeName }, "Manager logged in");
      res.json({
        token,
        role: "manager",
        name: manager.fullName,
        managerId: manager.id,
        storeName: manager.storeName,
        storeAddress: manager.storeAddress,
        login: manager.login,
        storeId: manager.storeId,
        phone: manager.phone,
        ...buildSubscriptionInfo(manager),
      });
      return;
    }

    res.status(401).json({ error: "Login yoki parol noto'g'ri" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Login va parolni kiriting" });
    } else {
      req.log.error({ err }, "Manager login failed");
      res.status(500).json({ error: "Kirishda xato" });
    }
  }
});

const workerRegisterSchema = z.object({
  name: z.string().min(2),
  phone: z.string().regex(/^\+998 \d{2} \d{3} \d{2} \d{2}$/),
  password: z.string().min(4),
  address: z.string().optional().default(""),
  storeName: z.string().trim().min(2, "Do'kon nomini kiriting"),
  storeId: z.string().regex(/^[A-Z]{2}\d{8}$/, "Do'kon ID noto'g'ri"),
});

router.post("/auth/worker-register", async (req, res) => {
  try {
    const body = workerRegisterSchema.parse(req.body);

    const [manager] = await db
      .select({ id: managersTable.id, storeName: managersTable.storeName })
      .from(managersTable)
      .where(
        and(
          eq(managersTable.storeName, body.storeName),
          eq(managersTable.storeId, body.storeId)
        )
      );

    if (!manager) {
      res.status(404).json({ error: "Bunday do'kon yoki ID raqam tizimda mavjud emas", code: "INVALID_STORE" });
      return;
    }

    const [existing] = await db
      .select({ id: workersTable.id, status: workersTable.status })
      .from(workersTable)
      .where(eq(workersTable.phone, body.phone));

    if (existing) {
      if (existing.status === "pending") {
        res.status(409).json({ error: "Bu telefon raqam bilan ariza allaqachon yuborilgan. Rahbar tasdig'ini kuting.", code: "PENDING" });
      } else if (existing.status === "approved") {
        res.status(409).json({ error: "Bu telefon raqam allaqachon ro'yxatdan o'tgan. Kirish sahifasiga o'ting.", code: "EXISTS" });
      } else {
        res.status(409).json({ error: "Bu telefon raqam rad etilgan. Boshqa raqam bilan urinib ko'ring.", code: "REJECTED" });
      }
      return;
    }

    const passwordHash = hashPassword(body.password);
    const [worker] = await db
      .insert(workersTable)
      .values({
        managerId: manager.id,
        name: body.name,
        address: body.address,
        phone: body.phone,
        passwordHash,
        status: "pending",
      })
      .returning();

    req.log.info({ workerId: worker?.id, managerId: manager.id }, "Worker registered");
    res.status(201).json({ id: worker?.id, name: worker?.name, status: "pending", storeName: manager.storeName });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.issues[0]?.message ?? "Ma'lumotlar noto'g'ri kiritildi" });
    } else {
      req.log.error({ err }, "Worker registration failed");
      res.status(500).json({ error: "Ro'yxatdan o'tishda xato" });
    }
  }
});

const workerLoginSchema = z.object({
  phone: z.string(),
  password: z.string(),
});

router.post("/auth/worker-login", async (req, res) => {
  try {
    const body = workerLoginSchema.parse(req.body);

    const [worker] = await db.select().from(workersTable).where(eq(workersTable.phone, body.phone));

    if (!worker || !verifyPassword(body.password, worker.passwordHash)) {
      res.status(401).json({ error: "Telefon raqam yoki parol noto'g'ri" });
      return;
    }

    if (worker.status === "rejected") {
      res.status(403).json({ error: "Sizning arizangiz rad etildi. Rahbar bilan bog'laning.", code: "REJECTED" });
      return;
    }

    const token = generateToken({
      sub: `worker-${worker.id}`,
      role: "worker",
      name: worker.name,
      workerId: worker.id,
      managerId: worker.managerId ?? undefined,
    });
    req.log.info({ workerId: worker.id, status: worker.status }, "Worker logged in");
    res.json({ token, workerId: worker.id, name: worker.name, status: worker.status, role: "worker" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Ma'lumotlar noto'g'ri" });
    } else {
      req.log.error({ err }, "Worker login failed");
      res.status(500).json({ error: "Kirishda xato" });
    }
  }
});

router.post("/auth/logout", requireAuth, (req, res) => {
  const token = extractBearerToken(req.headers["authorization"]);
  if (token) revokeToken(token);
  req.log.info({ user: res.locals.user?.name }, "User logged out");
  res.json({ ok: true });
});

router.get("/auth/me", requireAuth, async (req, res) => {
  const user = res.locals.user;
  if (user.role === "worker" && user.workerId) {
    try {
      const [worker] = await db
        .select({ status: workersTable.status, name: workersTable.name, managerId: workersTable.managerId })
        .from(workersTable)
        .where(eq(workersTable.id, user.workerId));
      if (!worker) {
        res.status(401).json({ error: "Ishchi topilmadi" });
        return;
      }
      // Also get manager's subscription for worker info
      let subInfo = {};
      if (worker.managerId) {
        const [mgr] = await db
          .select({ subscriptionPlan: managersTable.subscriptionPlan, subscriptionEnd: managersTable.subscriptionEnd, subscriptionActive: managersTable.subscriptionActive })
          .from(managersTable)
          .where(eq(managersTable.id, worker.managerId));
        if (mgr) subInfo = buildSubscriptionInfo(mgr);
      }
      res.json({ name: worker.name, role: "worker", workerId: user.workerId, status: worker.status, ...subInfo });
    } catch {
      res.json({ name: user.name, role: "worker", workerId: user.workerId, status: "unknown" });
    }
  } else if (user.managerId) {
    try {
      const [manager] = await db
        .select()
        .from(managersTable)
        .where(eq(managersTable.id, user.managerId));
      if (!manager) {
        res.status(401).json({ error: "Rahbar topilmadi" });
        return;
      }
      res.json({
        name: manager.fullName,
        role: "manager",
        managerId: manager.id,
        storeName: manager.storeName,
        storeAddress: manager.storeAddress,
        login: manager.login,
        storeId: manager.storeId,
        phone: manager.phone,
        blocked: manager.blocked ?? false,
        ...buildSubscriptionInfo(manager),
      });
    } catch {
      res.json({ name: user.name, role: "manager", managerId: user.managerId });
    }
  } else {
    res.json({ name: "Rahbar", role: "manager" });
  }
});

// Change own credentials (manager only) — logged to audit
const changeCredentialsSchema = z.object({
  newLogin: z.string().regex(/^[A-Z0-9]{8}$/, "Login 8 ta katta harf va raqam").optional(),
  newPassword: z.string().regex(/^\d{6}$/, "Parol 6 ta raqam").optional(),
  currentPassword: z.string().min(1, "Joriy parolni kiriting"),
});

router.post("/auth/change-credentials", requireAuth, async (req, res) => {
  const user = res.locals.user;
  if (!user.managerId) {
    res.status(403).json({ error: "Faqat rahbar o'z login/parolini o'zgartira oladi" });
    return;
  }
  try {
    const body = changeCredentialsSchema.parse(req.body);
    const [manager] = await db.select().from(managersTable).where(eq(managersTable.id, user.managerId));
    if (!manager) { res.status(404).json({ error: "Rahbar topilmadi" }); return; }
    if (!verifyPassword(body.currentPassword, manager.passwordHash)) {
      res.status(401).json({ error: "Joriy parol noto'g'ri" });
      return;
    }

    const updates: Record<string, unknown> = {};
    const changed: string[] = [];

    if (body.newLogin && body.newLogin !== manager.login) {
      const [conflict] = await db.select({ id: managersTable.id }).from(managersTable).where(eq(managersTable.login, body.newLogin));
      if (conflict) { res.status(409).json({ error: "Bu login band" }); return; }
      updates.login = body.newLogin;
      changed.push(`login: ${manager.login} → ${body.newLogin}`);
    }
    if (body.newPassword) {
      updates.passwordHash = hashPassword(body.newPassword);
      updates.encryptedPassword = encryptValue(body.newPassword);
      changed.push("parol o'zgartirildi");
    }

    if (Object.keys(updates).length === 0) {
      res.json({ ok: true, message: "O'zgarish yo'q" });
      return;
    }

    await db.update(managersTable).set(updates as Partial<typeof managersTable.$inferInsert>).where(eq(managersTable.id, user.managerId));
    await db.insert(auditLogsTable).values({
      managerId: user.managerId,
      action: changed.some(c => c.startsWith("parol")) ? "password_changed" : "login_changed",
      details: changed.join("; "),
    });

    req.log.info({ managerId: user.managerId, changed }, "Manager changed credentials");
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.issues[0]?.message ?? "Noto'g'ri ma'lumot" });
    } else {
      req.log.error({ err }, "Change credentials failed");
      res.status(500).json({ error: "Xato" });
    }
  }
});

router.post("/auth/forgot-credentials", async (req, res) => {
  const schema = z.object({
    phone: z.string().min(7, "Telefon raqamni kiriting"),
    storeId: z.string().regex(/^[A-Z]{2}\d{8}$/, "Do'kon ID noto'g'ri (2 harf + 8 raqam)"),
  });
  try {
    const body = schema.parse(req.body);
    const normalizedPhone = body.phone.replace(/\D/g, "");

    const [manager] = await db
      .select()
      .from(managersTable)
      .where(
        and(
          sql`regexp_replace(${managersTable.phone}, '[^0-9]', '', 'g') = ${normalizedPhone}`,
          eq(managersTable.storeId, body.storeId)
        )
      );

    if (!manager) {
      res.status(404).json({
        error: "Telefon raqam yoki Do'kon ID noto'g'ri. Ro'yxatdan o'tishda kiritilgan ma'lumotlarni kiriting.",
        code: "NOT_FOUND",
      });
      return;
    }

    const token = generateToken({
      sub: `manager-${manager.id}`,
      role: "manager",
      name: manager.fullName,
      managerId: manager.id,
    });

    req.log.info({ managerId: manager.id }, "Manager recovered via phone+storeId");
    res.json({
      token,
      role: "manager",
      name: manager.fullName,
      managerId: manager.id,
      storeName: manager.storeName,
      storeAddress: manager.storeAddress,
      login: manager.login,
      storeId: manager.storeId,
      phone: manager.phone,
      ...buildSubscriptionInfo(manager),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.issues[0]?.message ?? "Ma'lumotlar noto'g'ri" });
    } else {
      req.log.error({ err }, "Forgot credentials failed");
      res.status(500).json({ error: "Xato yuz berdi" });
    }
  }
});

router.delete("/auth/manager-account", requireAuth, async (req, res) => {
  const user = res.locals.user;
  if (!user.managerId) {
    res.status(403).json({ error: "Faqat rahbar o'z hisobini o'chira oladi" });
    return;
  }
  try {
    const mid = user.managerId;
    await db.delete(deleteRequestsTable).where(eq(deleteRequestsTable.managerId, mid));
    await db.delete(salesTable).where(eq(salesTable.managerId, mid));
    await db.delete(customersTable).where(eq(customersTable.managerId, mid));
    await db.delete(productsTable).where(eq(productsTable.managerId, mid));
    await db.delete(workersTable).where(eq(workersTable.managerId, mid));
    await db.delete(auditLogsTable).where(eq(auditLogsTable.managerId, mid));
    await db.delete(managersTable).where(eq(managersTable.id, mid));

    const token = extractBearerToken(req.headers["authorization"]);
    if (token) revokeToken(token);

    req.log.info({ managerId: mid }, "Manager account fully deleted");
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Manager account deletion failed");
    res.status(500).json({ error: "Hisobni o'chirishda xato yuz berdi" });
  }
});

export default router;
