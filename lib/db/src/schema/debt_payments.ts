import { integer, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { customersTable } from "./customers";

export const debtPaymentsTable = pgTable("debt_payments", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customersTable.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type DebtPayment = typeof debtPaymentsTable.$inferSelect;
