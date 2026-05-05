import { db } from "@workspace/db";
import { customersTable, debtPaymentsTable, salesTable } from "@workspace/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

const router = Router();

const customerInputSchema = z.object({
  name: z.string().trim().min(1, "Ismi kiritilishi shart"),
  phone: z.string().trim().min(1, "Telefon raqami kiritilishi shart"),
  address: z
    .string()
    .trim()
    .nullish()
    .transform((v) => v ?? null),
  debtLimit: z
    .union([z.string(), z.number()])
    .transform((v) => String(parseFloat(String(v)) || 0))
    .optional()
    .default("0"),
  note: z
    .string()
    .trim()
    .nullish()
    .transform((v) => v ?? null),
});

const debtPaymentInputSchema = z.object({
  amount: z
    .union([z.string(), z.number()])
    .transform((v) => parseFloat(String(v)))
    .pipe(z.number().positive("Summa musbat bo'lishi kerak")),
  note: z
    .string()
    .trim()
    .nullish()
    .transform((v) => v ?? null),
});

function mapCustomer(c: typeof customersTable.$inferSelect) {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    address: c.address ?? null,
    debtLimit: parseFloat(c.debtLimit),
    totalDebt: parseFloat(c.totalDebt),
    note: c.note ?? null,
    createdAt: c.createdAt.toISOString(),
  };
}

// GET /customers
router.get("/customers", async (req, res) => {
  try {
    const managerId = res.locals.user?.managerId;
    const condition = managerId !== undefined ? eq(customersTable.managerId, managerId) : undefined;
    const customers = await db
      .select()
      .from(customersTable)
      .where(condition)
      .orderBy(desc(customersTable.createdAt));
    res.json(customers.map(mapCustomer));
  } catch (err) {
    req.log.error({ err }, "Failed to get customers");
    res.status(500).json({ error: "Mijozlarni olishda xatolik" });
  }
});

// POST /customers
router.post("/customers", async (req, res) => {
  try {
    const body = customerInputSchema.parse(req.body);
    const managerId = res.locals.user?.managerId ?? null;
    const [customer] = await db
      .insert(customersTable)
      .values({
        managerId,
        name: body.name,
        phone: body.phone,
        address: body.address,
        debtLimit: body.debtLimit,
        note: body.note,
      })
      .returning();
    res.status(201).json(mapCustomer(customer));
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validatsiya xatosi", details: err.issues });
      return;
    }
    req.log.error({ err }, "Failed to create customer");
    res.status(500).json({ error: "Mijoz yaratishda xatolik" });
  }
});

// GET /customers/:id
router.get("/customers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params["id"] ?? "0", 10);
    const managerId = res.locals.user?.managerId;
    const condition = managerId !== undefined
      ? and(eq(customersTable.id, id), eq(customersTable.managerId, managerId))
      : eq(customersTable.id, id);
    const [customer] = await db.select().from(customersTable).where(condition);
    if (!customer) {
      res.status(404).json({ error: "Mijoz topilmadi" });
      return;
    }
    res.json(mapCustomer(customer));
  } catch (err) {
    req.log.error({ err }, "Failed to get customer");
    res.status(500).json({ error: "Mijozni olishda xatolik" });
  }
});

// PUT /customers/:id
router.put("/customers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params["id"] ?? "0", 10);
    const body = customerInputSchema.parse(req.body);
    const managerId = res.locals.user?.managerId;
    const condition = managerId !== undefined
      ? and(eq(customersTable.id, id), eq(customersTable.managerId, managerId))
      : eq(customersTable.id, id);
    const [updated] = await db
      .update(customersTable)
      .set({
        name: body.name,
        phone: body.phone,
        address: body.address,
        debtLimit: body.debtLimit,
        note: body.note,
      })
      .where(condition)
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Mijoz topilmadi" });
      return;
    }
    res.json(mapCustomer(updated));
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validatsiya xatosi", details: err.issues });
      return;
    }
    req.log.error({ err }, "Failed to update customer");
    res.status(500).json({ error: "Mijozni yangilashda xatolik" });
  }
});

// DELETE /customers/:id
router.delete("/customers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params["id"] ?? "0", 10);
    const managerId = res.locals.user?.managerId;
    const condition = managerId !== undefined
      ? and(eq(customersTable.id, id), eq(customersTable.managerId, managerId))
      : eq(customersTable.id, id);
    const [deleted] = await db
      .delete(customersTable)
      .where(condition)
      .returning();
    if (!deleted) {
      res.status(404).json({ error: "Mijoz topilmadi" });
      return;
    }
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to delete customer");
    res.status(500).json({ error: "Mijozni o'chirishda xatolik" });
  }
});

// GET /customers/:id/payments
router.get("/customers/:id/payments", async (req, res) => {
  try {
    const id = parseInt(req.params["id"] ?? "0", 10);
    const payments = await db
      .select()
      .from(debtPaymentsTable)
      .where(eq(debtPaymentsTable.customerId, id))
      .orderBy(desc(debtPaymentsTable.createdAt));
    res.json(
      payments.map((p) => ({
        id: p.id,
        customerId: p.customerId,
        amount: parseFloat(p.amount),
        note: p.note ?? null,
        createdAt: p.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to get payments");
    res.status(500).json({ error: "To'lovlarni olishda xatolik" });
  }
});

// POST /customers/:id/payments
router.post("/customers/:id/payments", async (req, res) => {
  try {
    const id = parseInt(req.params["id"] ?? "0", 10);
    const body = debtPaymentInputSchema.parse(req.body);

    const managerId = res.locals.user?.managerId;
    const condition = managerId !== undefined
      ? and(eq(customersTable.id, id), eq(customersTable.managerId, managerId))
      : eq(customersTable.id, id);

    const [customer] = await db.select().from(customersTable).where(condition);
    if (!customer) {
      res.status(404).json({ error: "Mijoz topilmadi" });
      return;
    }

    const currentDebt = parseFloat(customer.totalDebt);
    if (body.amount > currentDebt + 0.01) {
      res.status(400).json({
        error: `To'lov summasi qarzdan ko'p. Joriy qarz: ${currentDebt.toLocaleString()} UZS`,
      });
      return;
    }

    const result = await db.transaction(async (tx) => {
      const [payment] = await tx
        .insert(debtPaymentsTable)
        .values({
          customerId: id,
          amount: String(body.amount),
          note: body.note,
        })
        .returning();

      const newDebt = Math.max(0, currentDebt - body.amount);
      await tx
        .update(customersTable)
        .set({ totalDebt: String(newDebt) })
        .where(eq(customersTable.id, id));

      return payment;
    });

    res.status(201).json({
      id: result.id,
      customerId: result.customerId,
      amount: parseFloat(result.amount),
      note: result.note ?? null,
      createdAt: result.createdAt.toISOString(),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validatsiya xatosi", details: err.issues });
      return;
    }
    req.log.error({ err }, "Failed to create payment");
    res.status(500).json({ error: "To'lovni saqlashda xatolik" });
  }
});

// GET /customers/:id/statement
router.get("/customers/:id/statement", async (req, res) => {
  try {
    const id = parseInt(req.params["id"] ?? "0", 10);
    const managerId = res.locals.user?.managerId;
    const condition = managerId !== undefined
      ? and(eq(customersTable.id, id), eq(customersTable.managerId, managerId))
      : eq(customersTable.id, id);
    const [customer] = await db.select().from(customersTable).where(condition);
    if (!customer) {
      res.status(404).json({ error: "Mijoz topilmadi" });
      return;
    }

    const sales = await db
      .select()
      .from(salesTable)
      .where(eq(salesTable.customerId, id))
      .orderBy(desc(salesTable.createdAt));

    const payments = await db
      .select()
      .from(debtPaymentsTable)
      .where(eq(debtPaymentsTable.customerId, id))
      .orderBy(desc(debtPaymentsTable.createdAt));

    res.json({
      customer: mapCustomer(customer),
      sales: sales.map((s) => ({
        id: s.id,
        totalAmount: parseFloat(s.totalAmount),
        itemCount: s.itemCount,
        paymentType: s.paymentType,
        paidAmount: s.paidAmount ? parseFloat(s.paidAmount) : null,
        debtAmount: s.debtAmount ? parseFloat(s.debtAmount) : null,
        createdAt: s.createdAt.toISOString(),
      })),
      payments: payments.map((p) => ({
        id: p.id,
        amount: parseFloat(p.amount),
        note: p.note ?? null,
        createdAt: p.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get statement");
    res.status(500).json({ error: "Ko'chirmani olishda xatolik" });
  }
});

export default router;
