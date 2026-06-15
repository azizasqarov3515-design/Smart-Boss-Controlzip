import { integer, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productsTable } from "./products";
import { customersTable } from "./customers";

export const salesTable = pgTable("sales", {
  id: serial("id").primaryKey(),
  managerId: integer("manager_id"),
  totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull(),
  itemCount: integer("item_count").notNull().default(0),
  note: text("note"),
  paymentType: text("payment_type").notNull().default("cash"),
  customerId: integer("customer_id").references(() => customersTable.id, {
    onDelete: "set null",
  }),
  paidAmount: numeric("paid_amount", { precision: 14, scale: 2 }),
  debtAmount: numeric("debt_amount", { precision: 14, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  discountAmount: numeric("discount_amount", { precision: 14, scale: 2 }).notNull().default("0"),
});

export const saleItemsTable = pgTable("sale_items", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id")
    .notNull()
    .references(() => salesTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => productsTable.id, {
    onDelete: "set null",
  }),
  productName: text("product_name").notNull(),
  brand: text("brand").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 3 }).notNull(),
  unit: text("unit").notNull().default("dona"),
  totalPrice: numeric("total_price", { precision: 14, scale: 2 }).notNull(),
});

export const insertSaleSchema = createInsertSchema(salesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type Sale = typeof salesTable.$inferSelect;
export type SaleItem = typeof saleItemsTable.$inferSelect;
