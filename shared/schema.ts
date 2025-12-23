import { pgTable, text, serial, integer, boolean, timestamp, jsonb, date, real } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Import Auth and Chat models
export * from "./models/auth";
export * from "./models/chat";

// === TABLE DEFINITIONS ===

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(), // Links to users.id from auth
  type: text("type").notNull(), // 'pool', 'open_water'
  date: timestamp("date").notNull(),
  duration: integer("duration").notNull(), // in seconds
  distance: integer("distance").notNull(), // in meters
  stroke: text("stroke").notNull(), // 'freestyle', 'breaststroke', 'butterfly', 'backstroke', 'mixed'
  poolLength: integer("pool_length"), // in meters, nullable for open water
  pace: real("pace"), // seconds per 100m
  heartRateAvg: integer("heart_rate_avg"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const personalRecords = pgTable("personal_records", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  distance: integer("distance").notNull(), // e.g. 100, 200, 400
  stroke: text("stroke").notNull(),
  time: integer("time").notNull(), // seconds
  date: timestamp("date").notNull(),
  activityId: integer("activity_id").references(() => activities.id),
});

export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(), // 'distance_weekly', 'time_target', 'consistency'
  target: integer("target").notNull(), // value depends on type
  deadline: timestamp("deadline"),
  isCompleted: boolean("is_completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// === RELATIONS ===
export const activitiesRelations = relations(activities, ({ many }) => ({
  personalRecords: many(personalRecords),
}));

export const personalRecordsRelations = relations(personalRecords, ({ one }) => ({
  activity: one(activities, {
    fields: [personalRecords.activityId],
    references: [activities.id],
  }),
}));

// === BASE SCHEMAS ===
export const insertActivitySchema = createInsertSchema(activities).omit({ id: true, createdAt: true });
export const insertGoalSchema = createInsertSchema(goals).omit({ id: true, createdAt: true, isCompleted: true });

// === EXPLICIT API CONTRACT TYPES ===

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

export type PersonalRecord = typeof personalRecords.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type InsertGoal = z.infer<typeof insertGoalSchema>;

export type CreateActivityRequest = InsertActivity;
export type UpdateActivityRequest = Partial<InsertActivity>;
