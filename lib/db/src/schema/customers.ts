import { integer, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const customersTable = pgTable("customers", {
  id: serial("id").primaryKey(),
  managerId: integer("manager_id"),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  address: text("address"),
  debtLimit: numeric("debt_limit", { precision: 14, scale: 2 }).notNull().default("0"),
  totalDebt: numeric("total_debt", { precision: 14, scale: 2 }).notNull().default("0"),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Customer = typeof customersTable.$inferSelect;
