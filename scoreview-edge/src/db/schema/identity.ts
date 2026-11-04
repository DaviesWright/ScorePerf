import { boolean, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const companies = pgTable("base_company", {
  id: serial("id").primaryKey(),
  company: text("company").notNull(),
  hq: boolean("hq").default(false).notNull(),
  address: text("address"),
  country: text("country"),
  state: text("state"),
  city: text("city"),
  zip: text("zip"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("auth_user", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull(),
  isSuperuser: boolean("is_superuser").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const employees = pgTable("employee_employee", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id),
  companyId: serial("company_id").references(() => companies.id).notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  isActive: boolean("is_active").default(true).notNull(),
});

