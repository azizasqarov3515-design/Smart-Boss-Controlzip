import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  void registerTelegramWebhook();
});

async function registerTelegramWebhook() {
  const token = process.env["TELEGRAM_BOT_TOKEN"];
  const domain = process.env["REPLIT_DEV_DOMAIN"];
  if (!token || !domain) {
    logger.warn("TELEGRAM_BOT_TOKEN or REPLIT_DEV_DOMAIN not set — skipping webhook registration");
    return;
  }
  try {
    const webhookUrl = `https://${domain}/api/telegram/webhook`;
    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl, drop_pending_updates: true }),
    });
    const data = (await res.json()) as { ok: boolean; description?: string };
    if (data.ok) {
      logger.info({ webhookUrl }, "Telegram webhook registered");
    } else {
      logger.warn({ data }, "Telegram webhook registration returned not ok");
    }
  } catch (err) {
    logger.error({ err }, "Failed to register Telegram webhook");
  }
}
