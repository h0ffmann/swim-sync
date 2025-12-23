import { db } from "./db";
import {
  activities,
  personalRecords,
  goals,
  type InsertActivity,
  type Activity,
  type PersonalRecord,
  type Goal,
  type InsertGoal,
} from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // Activities
  getActivities(userId: string): Promise<Activity[]>;
  getActivity(id: number): Promise<Activity | undefined>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  deleteActivity(id: number): Promise<void>;

  // Personal Records
  getPersonalRecords(userId: string): Promise<PersonalRecord[]>;
  
  // Goals
  getGoals(userId: string): Promise<Goal[]>;
  createGoal(goal: InsertGoal): Promise<Goal>;
}

export class DatabaseStorage implements IStorage {
  async getActivities(userId: string): Promise<Activity[]> {
    return await db.select().from(activities).where(eq(activities.userId, userId)).orderBy(desc(activities.date));
  }

  async getActivity(id: number): Promise<Activity | undefined> {
    const [activity] = await db.select().from(activities).where(eq(activities.id, id));
    return activity;
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const [activity] = await db.insert(activities).values(insertActivity).returning();
    return activity;
  }

  async deleteActivity(id: number): Promise<void> {
    await db.delete(activities).where(eq(activities.id, id));
  }

  async getPersonalRecords(userId: string): Promise<PersonalRecord[]> {
    return await db.select().from(personalRecords).where(eq(personalRecords.userId, userId));
  }

  async getGoals(userId: string): Promise<Goal[]> {
    return await db.select().from(goals).where(eq(goals.userId, userId));
  }

  async createGoal(insertGoal: InsertGoal): Promise<Goal> {
    const [goal] = await db.insert(goals).values(insertGoal).returning();
    return goal;
  }
}

export const storage = new DatabaseStorage();
