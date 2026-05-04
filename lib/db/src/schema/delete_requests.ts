import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const deleteRequestsTable = pgTable("delete_requests", {
  id: serial("id").primaryKey(),
  saleIds: text("sale_ids").notNull(),
  workerId: integer("worker_id"),
  workerName: text("worker_name").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type DeleteRequest = typeof deleteRequestsTable.$inferSelect;
