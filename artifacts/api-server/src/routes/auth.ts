import crypto from "crypto";
import { db } from "@workspace/db";
import { workersTable } from "@workspace/db/schema";
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

router.post("/auth/login", (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };

  const adminUsername = process.env["ADMIN_USERNAME"] ?? "admin";
  const adminPassword = process.env["ADMIN_PASSWORD"];

  if (!adminPassword) {
    req.log.error("ADMIN_PASSWORD environment variable is not set");
    res.status(500).json({ error: "Server konfiguratsiya xatosi" });
    return;
  }

  if (!username || !password || username !== adminUsername || password !== adminPassword) {
    res.status(401).json({ error: "Login yoki parol noto'g'ri" });
    return;
  }

  const token = generateToken({ sub: "admin", role: "manager", name: "Rahbar" });
  req.log.info({ username }, "Manager logged in");
  res.json({ token, username: adminUsername, role: "manager", name: "Rahbar" });
});

const workerRegisterSchema = z.object({
  name: z.string().min(2),
  address: z.string().min(2),
  phone: z.string().regex(/^\+998 \d{2} \d{3} \d{2} \d{2}$/),
  password: z.string().min(4),
});

router.post("/auth/worker-register", async (req, res) => {
  try {
    const body = workerRegisterSchema.parse(req.body);

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
      .values({ name: body.name, address: body.address, phone: body.phone, passwordHash, status: "pending" })
      .returning();

    req.log.info({ workerId: worker?.id }, "Worker registered");
    res.status(201).json({ id: worker?.id, name: worker?.name, status: "pending" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Ma'lumotlar noto'g'ri kiritildi" });
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

    const token = generateToken({ sub: `worker-${worker.id}`, role: "worker", name: worker.name, workerId: worker.id });
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
  } else {
    const adminUsername = process.env["ADMIN_USERNAME"] ?? "admin";
    res.json({ username: adminUsername, name: "Rahbar", role: "manager" });
  }
});

export default router;
