import crypto from "crypto";
import { db } from "@workspace/db";
import { workersTable, managersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { generateToken, revokeToken, extractBearerToken, requireAuth } from "../lib/auth";

const router = Router();

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

const managerRegisterSchema = z.object({
  fullName: z.string().trim().min(2, "Ism familiya kamida 2 ta harf"),
  address: z.string().trim().min(2, "Yashash joyi kiritilishi shart"),
  phone: z.string().trim().min(7, "Telefon raqami kiritilishi shart"),
  storeName: z.string().trim().min(2, "Do'kon nomi kiritilishi shart"),
  storeAddress: z.string().trim().min(2, "Do'kon manzili kiritilishi shart"),
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

    const passwordHash = hashPassword(body.password);
    const [manager] = await db
      .insert(managersTable)
      .values({
        fullName: body.fullName,
        address: body.address,
        phone: body.phone,
        storeName: body.storeName,
        storeAddress: body.storeAddress,
        login: body.login,
        passwordHash,
      })
      .returning();

    req.log.info({ managerId: manager?.id, storeName: body.storeName }, "Manager registered");
    res.status(201).json({ id: manager?.id, storeName: manager?.storeName });
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
      });
      return;
    }

    const adminUsername = process.env["ADMIN_USERNAME"] ?? "admin";
    const adminPassword = process.env["ADMIN_PASSWORD"];
    if (adminPassword && body.login === adminUsername && body.password === adminPassword) {
      const token = generateToken({ sub: "admin", role: "manager", name: "Rahbar" });
      req.log.info({ username: adminUsername }, "Admin logged in");
      res.json({ token, role: "manager", name: "Rahbar", username: adminUsername });
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
  address: z.string().min(2),
  phone: z.string().regex(/^\+998 \d{2} \d{3} \d{2} \d{2}$/),
  password: z.string().min(4),
  managerLoginCode: z.string().regex(/^[A-Z0-9]{8}$/, "Do'kon kodi noto'g'ri"),
});

router.post("/auth/worker-register", async (req, res) => {
  try {
    const body = workerRegisterSchema.parse(req.body);

    const [manager] = await db
      .select({ id: managersTable.id, storeName: managersTable.storeName })
      .from(managersTable)
      .where(eq(managersTable.login, body.managerLoginCode));

    if (!manager) {
      res.status(404).json({ error: "Do'kon kodi noto'g'ri. Rahbardan to'g'ri kodni oling.", code: "INVALID_STORE" });
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
        .select({ status: workersTable.status, name: workersTable.name })
        .from(workersTable)
        .where(eq(workersTable.id, user.workerId));
      if (!worker) {
        res.status(401).json({ error: "Ishchi topilmadi" });
        return;
      }
      res.json({ name: worker.name, role: "worker", workerId: user.workerId, status: worker.status });
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
      });
    } catch {
      res.json({ name: user.name, role: "manager", managerId: user.managerId });
    }
  } else {
    const adminUsername = process.env["ADMIN_USERNAME"] ?? "admin";
    res.json({ username: adminUsername, name: "Rahbar", role: "manager" });
  }
});

export default router;
