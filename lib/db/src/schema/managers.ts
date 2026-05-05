import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const managersTable = pgTable("managers", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  address: text("address").notNull(),
  phone: text("phone").notNull(),
  storeName: text("store_name").notNull(),
  storeAddress: text("store_address").notNull(),
  login: text("login").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Manager = typeof managersTable.$inferSelect;
