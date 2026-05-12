import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable, managersTable, workersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { ai } from "@workspace/integrations-gemini-ai";
import { requireAuth } from "../lib/auth";

const router = Router();

router.post("/products/image-search", requireAuth, async (req, res) => {
  try {
    const { image, mimeType = "image/jpeg" } = req.body as {
      image: string;
      mimeType?: string;
    };

    if (!image) {
      res.status(400).json({ error: "Rasm majburiy" });
      return;
    }

    const user = res.locals.user;

    // Resolve managerId for both managers and workers
    let managerId: number | null = null;
    if (user.role === "manager" && user.managerId) {
      managerId = user.managerId;
    } else if (user.role === "worker" && user.workerId) {
      const [worker] = await db
        .select({ managerId: workersTable.managerId })
        .from(workersTable)
        .where(eq(workersTable.id, user.workerId));
      managerId = worker?.managerId ?? null;
    }

    if (!managerId) {
      res.status(400).json({ error: "Manager topilmadi" });
      return;
    }

    // Fetch products for this manager
    const products = await db
      .select({
        id: productsTable.id,
        name: productsTable.name,
        brand: productsTable.brand,
      })
      .from(productsTable)
      .where(eq(productsTable.managerId, managerId));

    if (products.length === 0) {
      res.json({ matchedIds: [], searchQuery: "" });
      return;
    }

    const productList = products
      .map((p) => `ID:${p.id} | "${p.name}" (${p.brand})`)
      .join("\n");

    const prompt = `You are a product recognition system for a store inventory app.
Analyze the image and find which product(s) from the list below match what is shown in the image.

Product list:
${productList}

Rules:
- Match by visual appearance, packaging, label, color, shape, text visible in the image
- It's okay to return multiple matches if the image could match several products
- Return the best matching product name for searchQuery (in the same language as the product name)

Respond ONLY with valid JSON, nothing else:
{"matchedIds": [id1, id2], "searchQuery": "product name"}

If no product matches: {"matchedIds": [], "searchQuery": ""}`;

    req.log.info({ managerId, productCount: products.length }, "Image search started");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType,
                data: image,
              },
            },
            { text: prompt },
          ],
        },
      ],
      config: { maxOutputTokens: 256 },
    });

    const text = (response.text ?? "").trim();
    req.log.info({ text }, "Gemini image search response");

    // Extract JSON from response (handle markdown code blocks too)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      req.log.warn({ text }, "Could not find JSON in Gemini response");
      res.json({ matchedIds: [], searchQuery: "" });
      return;
    }

    const result = JSON.parse(jsonMatch[0]) as {
      matchedIds: number[];
      searchQuery: string;
    };

    // Validate matchedIds are real product IDs
    const validIds = new Set(products.map((p) => p.id));
    const safeIds = (result.matchedIds ?? []).filter((id) => validIds.has(id));

    res.json({ matchedIds: safeIds, searchQuery: result.searchQuery ?? "" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    req.log.error({ err }, "Image search failed");
    res.status(500).json({ error: `Qidirishda xato: ${msg}` });
  }
});

export default router;
