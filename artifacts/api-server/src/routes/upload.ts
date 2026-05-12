import { Router } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { requireAuth } from "../lib/auth";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const SIDECAR = "http://127.0.0.1:1106";

async function getSignedUrl(
  bucketId: string,
  objectName: string,
  method: "PUT" | "GET",
  ttlSec: number,
): Promise<string> {
  const body = {
    bucket_name: bucketId,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };

  const res = await fetch(`${SIDECAR}/object-storage/signed-object-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sidecar signed URL xatosi (${res.status}): ${text}`);
  }

  const { signed_url } = await res.json() as { signed_url: string };
  return signed_url;
}

router.post("/upload/product-image", requireAuth, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Fayl yuborilmadi" });
      return;
    }

    const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
    if (!bucketId) {
      req.log.error("DEFAULT_OBJECT_STORAGE_BUCKET_ID env var yo'q");
      res.status(500).json({ error: "Object storage sozlanmagan" });
      return;
    }

    const objectName = `product-images/${randomUUID()}.jpg`;
    req.log.info({ bucketId, objectName, size: req.file.size }, "Rasm yuklash boshlandi");

    // 1. Signed PUT URL olish (15 daqiqa — upload uchun yetarli)
    const putUrl = await getSignedUrl(bucketId, objectName, "PUT", 900);
    req.log.info("Signed PUT URL olindi");

    // 2. Rasmni GCS ga yuklash
    const gcsRes = await fetch(putUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "image/jpeg",
      },
      body: req.file.buffer,
      signal: AbortSignal.timeout(30_000),
    });

    if (!gcsRes.ok) {
      const errText = await gcsRes.text();
      req.log.error({ status: gcsRes.status, body: errText }, "GCS PUT xatosi");
      throw new Error(`GCS yuklash xatosi (${gcsRes.status}): ${errText}`);
    }

    req.log.info("GCS ga yuklash muvaffaqiyatli");

    // 3. Signed GET URL olish (10 yil — amalda doimiy)
    const TEN_YEARS_SEC = 10 * 365 * 24 * 3600;
    const getUrl = await getSignedUrl(bucketId, objectName, "GET", TEN_YEARS_SEC);
    req.log.info("Signed GET URL olindi");

    res.json({ url: getUrl });
  } catch (err) {
    req.log.error({ err }, "Product image upload failed");
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Yuklashda xato: ${msg}` });
  }
});

export default router;
