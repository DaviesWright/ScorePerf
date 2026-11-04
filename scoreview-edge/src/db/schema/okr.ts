import { boolean, date, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { companies, employees } from "./identity";

export const objectives = pgTable("pms_objective", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  duration: integer("duration").default(1).notNull(),
  durationUnit: text("duration_unit").default("days").notNull(),
  archive: boolean("archive").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const keyResults = pgTable("pms_keyresult", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  progressType: text("progress_type").default("percentage").notNull(),
  targetValue: integer("target_value").default(100).notNull(),
  duration: integer("duration"),
  archive: boolean("archive").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const employeeObjectives = pgTable("pms_employeeobjective", {
  id: serial("id").primaryKey(),
  objectiveId: integer("objective_id").references(() => objectives.id, { onDelete: "restrict" }),
  employeeId: integer("employee_id").references(() => employees.id, { onDelete: "restrict" }),
  objective: text("objective"),
  objectiveDescription: text("objective_description"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: text("status").default("Not Started").notNull(),
  progressPercentage: integer("progress_percentage").default(0).notNull(),
  archive: boolean("archive").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const employeeKeyResults = pgTable("pms_employeekeyresult", {
  id: serial("id").primaryKey(),
  employeeObjectiveId: integer("employee_objective_id")
    .notNull()
    .references(() => employeeObjectives.id, { onDelete: "cascade" }),
  keyResultId: integer("key_result_id")
    .notNull()
    .references(() => keyResults.id, { onDelete: "restrict" }),
  startValue: integer("start_value").default(0).notNull(),
  currentValue: integer("current_value").default(0).notNull(),
  targetValue: integer("target_value").default(100).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  status: text("status").default("Not Started").notNull(),
  progressPercentage: integer("progress_percentage").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const comments = pgTable("pms_comment", {
  id: serial("id").primaryKey(),
  employeeObjectiveId: integer("employee_objective_id")
    .notNull()
    .references(() => employeeObjectives.id, { onDelete: "cascade" }),
  employeeId: integer("employee_id").references(() => employees.id, { onDelete: "set null" }),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

