import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { managersTable } from "./managers";

export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  managerId: integer("manager_id").references(() => managersTable.id, { onDelete: "cascade" }),
  action: text("action").notNull(), // 'login_changed' | 'password_changed' | 'subscription_changed' | 'temp_credentials_set'
  details: text("details"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type AuditLog = typeof auditLogsTable.$inferSelect;
