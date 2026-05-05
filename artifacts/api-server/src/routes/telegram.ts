import { Router } from "express";
import { db } from "@workspace/db";
import { managersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

type TelegramUpdate = {
  update_id: number;
  message?: {
    from?: { id: number; first_name?: string };
    text?: string;
  };
};

async function sendMsg(chatId: number | string, text: string): Promise<void> {
  const token = process.env["TELEGRAM_BOT_TOKEN"];
  if (!token) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch (err) {
    logger.error({ err }, "Telegram sendMsg failed");
  }
}

router.post("/telegram/webhook", async (req, res) => {
  res.json({ ok: true });

  const update = req.body as TelegramUpdate;
  const msg = update?.message;
  if (!msg?.text || !msg.from) return;

  const chatId = msg.from.id;
  const raw = msg.text.trim();

  const extracted = raw.startsWith("/start ") ? raw.slice(7).trim() : raw;
  const code = extracted.toUpperCase();

  if (/^\/START$/i.test(raw)) {
    await sendMsg(
      chatId,
      "👋 SMARTBOSScontrol botiga xush kelibsiz!\n\n" +
        "Hisobingizni bog'lash uchun 8 ta belgidan iborat login kodingizni yuboring.\n\n" +
        "📋 Login kodingizni ilova → Sozlamalar → Do'kon ma'lumotlari bo'limida topasiz.",
    );
    return;
  }

  if (!/^[A-Z0-9]{8}$/.test(code)) {
    await sendMsg(
      chatId,
      "ℹ️ Login kodingizni yuboring (8 ta belgi, masalan: AB12CD34)\n\n" +
        "Kodni Sozlamalar → Do'kon ma'lumotlari bo'limida topasiz.",
    );
    return;
  }

  try {
    const [manager] = await db
      .select({ id: managersTable.id, fullName: managersTable.fullName })
      .from(managersTable)
      .where(eq(managersTable.login, code));

    if (!manager) {
      await sendMsg(chatId, "❌ Bu login kod topilmadi. Kodni to'g'ri kiritganingizni tekshiring va qayta urinib ko'ring.");
      return;
    }

    await db.update(managersTable).set({ telegramChatId: String(chatId) }).where(eq(managersTable.id, manager.id));
    await sendMsg(
      chatId,
      `✅ Hurmatli ${manager.fullName}!\n\n` +
        "Telegram hisobingiz muvaffaqiyatli bog'landi.\n\n" +
        "Bundan buyon parolni tiklash va bildirishnomalar shu botga yuboriladi.",
    );
    logger.info({ managerId: manager.id, chatId }, "Telegram chat linked to manager");
  } catch (err) {
    logger.error({ err }, "Telegram webhook processing error");
  }
});

export default router;
