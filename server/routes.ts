import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerImageRoutes } from "./replit_integrations/image";
import { registerCSVRoutes } from "./replit_integrations/csv";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Auth
  await setupAuth(app);
  registerAuthRoutes(app);

  // Setup AI Integrations
  registerChatRoutes(app);
  registerImageRoutes(app);
  
  // Setup CSV Import
  registerCSVRoutes(app);

  // === Activity Routes ===
  app.get(api.activities.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    const userId = (req.user as any).claims.sub;
    const activities = await storage.getActivities(userId);
    res.json(activities);
  });

  app.get(api.activities.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    const activity = await storage.getActivity(Number(req.params.id));
    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }
    // Simple auth check: ensure activity belongs to user (in a real app, do this in query)
    const userId = (req.user as any).claims.sub;
    if (activity.userId !== userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    res.json(activity);
  });

  app.post(api.activities.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    try {
      const userId = (req.user as any).claims.sub;
      // Force userId from auth
      const input = api.activities.create.input.parse({ ...req.body, userId });
      const activity = await storage.createActivity(input);
      res.status(201).json(activity);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.activities.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    await storage.deleteActivity(Number(req.params.id));
    res.status(204).send();
  });

  // === PR & Goal Routes ===
  app.get(api.personalRecords.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    const userId = (req.user as any).claims.sub;
    const prs = await storage.getPersonalRecords(userId);
    res.json(prs);
  });

  app.get(api.goals.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    const userId = (req.user as any).claims.sub;
    const goals = await storage.getGoals(userId);
    res.json(goals);
  });

  app.post(api.goals.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    try {
      const userId = (req.user as any).claims.sub;
      const input = api.goals.create.input.parse({ ...req.body, userId });
      const goal = await storage.createGoal(input);
      res.status(201).json(goal);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Seed endpoint for demo data
  app.post("/api/seed", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    const userId = (req.user as any).claims.sub;
    
    // Check if user already has activities
    const existing = await storage.getActivities(userId);
    if (existing.length > 0) {
      return res.json({ message: "Data already exists" });
    }

    // Create realistic seed data
    const today = new Date();
    const oneDay = 24 * 60 * 60 * 1000;
    
    const seedActivities = [
      {
        userId,
        type: "pool",
        date: new Date(today.getTime() - 1 * oneDay),
        duration: 3600, // 1 hour
        distance: 2500,
        stroke: "freestyle",
        poolLength: 50,
        pace: 144, // 2:24/100m
        heartRateAvg: 145,
        notes: "Endurance focus",
      },
      {
        userId,
        type: "pool",
        date: new Date(today.getTime() - 3 * oneDay),
        duration: 2700, // 45 mins
        distance: 1800,
        stroke: "mixed",
        poolLength: 25,
        pace: 150, // 2:30/100m
        heartRateAvg: 138,
        notes: "Technique drills",
      },
      {
        userId,
        type: "open_water",
        date: new Date(today.getTime() - 5 * oneDay),
        duration: 4200, // 1h 10m
        distance: 3000,
        stroke: "freestyle",
        poolLength: null,
        pace: 140, // 2:20/100m
        heartRateAvg: 152,
        notes: "Morning lake swim, choppy water",
      }
    ];

    for (const act of seedActivities) {
      // @ts-ignore
      await storage.createActivity(act);
    }

    // Seed PRs
    const seedGoals = [
      {
        userId,
        type: "distance_weekly",
        target: 10000, // 10km/week
        deadline: new Date(today.getTime() + 30 * oneDay),
        isCompleted: false,
      }
    ];

    for (const g of seedGoals) {
      // @ts-ignore
      await storage.createGoal(g);
    }

    res.json({ message: "Seed data created" });
  });

  return httpServer;
}
