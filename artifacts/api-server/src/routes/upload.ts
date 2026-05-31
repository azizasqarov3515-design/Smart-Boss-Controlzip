import { Router } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { objectStorageClient } from "../lib/objectStorage";
import { requireAuth } from "../lib/auth";
import fs from "fs";
import path from "path";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post("/upload/product-image", requireAuth, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Fayl yuborilmadi" });
      return;
    }

    const uuid = randomUUID();
    const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
    
    if (!bucketId || bucketId === "undefined" || bucketId === "null" || bucketId === "sozlanmagan" || bucketId.trim() === "") {
      const localUploadsDir = path.join(process.cwd(), "uploads");
      if (!fs.existsSync(localUploadsDir)) {
        fs.mkdirSync(localUploadsDir, { recursive: true });
      }
      const localPath = path.join(localUploadsDir, `${uuid}.jpg`);
      await fs.promises.writeFile(localPath, req.file.buffer);

      const host = req.headers.host ?? "";
      const protocol = req.headers["x-forwarded-proto"] ?? "https";
      const imageUrl = `${protocol}://${host}/api/product-image/${uuid}`;

      req.log.info({ imageUrl, localPath }, "Local diskka saqlandi");
      res.json({ url: imageUrl });
      return;
    }

    const objectName = `product-images/${uuid}.jpg`;

    req.log.info({ bucketId, objectName, size: req.file.size }, "Rasm yuklash boshlandi");

    const bucket = objectStorageClient.bucket(bucketId);
    const file = bucket.file(objectName);

    // Save file to GCS (no makePublic — UBA blocks ACL changes)
    await file.save(req.file.buffer, {
      contentType: "image/jpeg",
      metadata: { cacheControl: "public, max-age=31536000" },
    });

    req.log.info({ objectName }, "GCS ga saqlandi");

    // Return an API URL so this server serves the image (avoids ACL/signed-URL issues)
    const host = req.headers.host ?? "";
    const protocol = req.headers["x-forwarded-proto"] ?? "https";
    const imageUrl = `${protocol}://${host}/api/product-image/${uuid}`;

    req.log.info({ imageUrl }, "Yuklash muvaffaqiyatli, URL qaytarildi");
    res.json({ url: imageUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    req.log.error({ err }, "Product image upload failed");
    res.status(500).json({ error: `Yuklashda xato: ${msg}` });
  }
});

export default router;
