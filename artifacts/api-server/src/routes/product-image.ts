import { Router } from "express";
import { objectStorageClient } from "../lib/objectStorage";

const router = Router();

// Public endpoint — no auth required (product images are not sensitive)
router.get("/product-image/:uuid", async (req, res) => {
  const { uuid } = req.params;

  // Basic UUID validation to prevent path traversal
  if (!/^[0-9a-f-]{36}$/.test(uuid)) {
    res.status(400).json({ error: "Noto'g'ri UUID" });
    return;
  }

  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  if (!bucketId) {
    res.status(500).json({ error: "Object storage sozlanmagan" });
    return;
  }

  const objectName = `product-images/${uuid}.jpg`;

  try {
    const bucket = objectStorageClient.bucket(bucketId);
    const file = bucket.file(objectName);

    const [exists] = await file.exists();
    if (!exists) {
      res.status(404).json({ error: "Rasm topilmadi" });
      return;
    }

    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=31536000");

    file.createReadStream()
      .on("error", (err) => {
        req.log?.error({ err }, "Image stream error");
        if (!res.headersSent) {
          res.status(500).json({ error: "Rasmni o'qishda xato" });
        }
      })
      .pipe(res);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    req.log?.error({ err }, "product-image route error");
    res.status(500).json({ error: `Xato: ${msg}` });
  }
});

export default router;
