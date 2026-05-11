import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const workersTable = pgTable("workers", {
  id: serial("id").primaryKey(),
  managerId: integer("manager_id"),
  name: text("name").notNull(),
  address: text("address").notNull(),
  phone: text("phone").notNull(),
  passwordHash: text("password_hash").notNull(),
  status: text("status").notNull().default("pending"),
  isOnline: boolean("is_online").notNull().default(false),
  lastSeen: timestamp("last_seen"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Worker = typeof workersTable.$inferSelect;
