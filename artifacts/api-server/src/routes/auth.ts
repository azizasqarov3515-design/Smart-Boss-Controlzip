import { Router } from "express";
import { generateToken, revokeToken, extractBearerToken, requireAuth } from "../lib/auth";

const router = Router();

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

  const token = generateToken();
  req.log.info({ username }, "Admin logged in");
  res.json({ token, username: adminUsername });
});

router.post("/auth/logout", requireAuth, (req, res) => {
  const token = extractBearerToken(req.headers["authorization"]);
  if (token) revokeToken(token);
  req.log.info("Admin logged out");
  res.json({ ok: true });
});

router.get("/auth/me", requireAuth, (req, res) => {
  const adminUsername = process.env["ADMIN_USERNAME"] ?? "admin";
  res.json({ username: adminUsername });
});

export default router;
