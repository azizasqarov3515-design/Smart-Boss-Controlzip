import { Router } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { objectStorageClient } from "../lib/objectStorage";
import { requireAuth } from "../lib/auth";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post("/upload/product-image", requireAuth, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Fayl yuborilmadi" });
      return;
    }

    const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
    if (!bucketId) {
      res.status(500).json({ error: "Object storage sozlanmagan" });
      return;
    }

    const ext = req.file.originalname.split(".").pop()?.toLowerCase() ?? "jpg";
    const objectName = `product-images/${randomUUID()}.${ext}`;

    const bucket = objectStorageClient.bucket(bucketId);
    const file = bucket.file(objectName);

    await file.save(req.file.buffer, {
      contentType: req.file.mimetype,
      metadata: { cacheControl: "public, max-age=31536000" },
    });

    await file.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucketId}/${objectName}`;

    res.json({ url: publicUrl });
  } catch (err) {
    req.log.error({ err }, "Product image upload failed");
    res.status(500).json({ error: "Yuklashda xato yuz berdi" });
  }
});

export default router;
