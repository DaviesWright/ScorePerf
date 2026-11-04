import { boolean, date, integer, jsonb, pgEnum, pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";
import { companies, employees } from "./identity";

export const frameworkCodeEnum = pgEnum("framework_code", ["OKR", "MBO", "BSC"]);

export const cycleStatusEnum = pgEnum("cycle_status", [
  "draft",
  "configured",
  "approved",
  "active",
  "review",
  "calibration",
  "approval",
  "certified",
  "published",
  "closed",
]);

export const frameworkTypes = pgTable("scoreview_core_frameworktype", {
  id: serial("id").primaryKey(),
  code: frameworkCodeEnum("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").default("").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export const frameworkConfigurations = pgTable(
  "scoreview_core_frameworkconfiguration",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    frameworkTypeId: integer("framework_type_id")
      .notNull()
      .references(() => frameworkTypes.id, { onDelete: "restrict" }),
    version: integer("version").default(1).notNull(),
    settings: jsonb("settings").default({}).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    unique("uq_company_framework_version").on(
      table.companyId,
      table.frameworkTypeId,
      table.version
    ),
  ]
);

export const performanceCycles = pgTable("scoreview_core_performancecycle", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").default("").notNull(),
  frameworkTypeId: integer("framework_type_id")
    .notNull()
    .references(() => frameworkTypes.id, { onDelete: "restrict" }),
  frameworkConfigurationId: integer("framework_configuration_id").references(
    () => frameworkConfigurations.id,
    { onDelete: "restrict" }
  ),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: cycleStatusEnum("status").default("draft").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const performanceAssignments = pgTable(
  "scoreview_core_performanceassignment",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    cycleId: integer("cycle_id")
      .notNull()
      .references(() => performanceCycles.id, { onDelete: "cascade" }),
    employeeId: integer("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    status: text("status").default("assigned").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    unique("uq_cycle_employee").on(table.cycleId, table.employeeId),
  ]
);

export const okrCycleLinks = pgTable("scoreview_core_okrcyclelink", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  cycleId: integer("cycle_id")
    .notNull()
    .references(() => performanceCycles.id, { onDelete: "cascade" }),
  employeeObjectiveId: integer("employee_objective_id")
    .notNull()
    .unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

