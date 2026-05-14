import { boolean, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const managersTable = pgTable("managers", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  address: text("address").notNull(),
  phone: text("phone").notNull(),
  storeName: text("store_name").notNull(),
  storeAddress: text("store_address").notNull(),
  storeId: text("store_id").notNull().unique(),
  login: text("login").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  telegramChatId: text("telegram_chat_id"),
  email: text("email"),
  encryptedPassword: text("encrypted_password"),
  // Subscription fields
  subscriptionPlan: text("subscription_plan"), // '1m' | '3m' | '6m' | '1y' | 'unlimited'
  subscriptionEnd: timestamp("subscription_end"),
  subscriptionActive: boolean("subscription_active").notNull().default(false),
  // Block field
  blocked: boolean("blocked").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Manager = typeof managersTable.$inferSelect;
