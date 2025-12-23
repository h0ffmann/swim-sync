import type { Express, Request, Response } from "express";
import { parseGarminCSV } from "./parser";
import { storage } from "../../storage";

export function registerCSVRoutes(app: Express): void {
  app.post("/api/import/csv", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = (req.user as any).claims.sub;
      const { csvContent } = req.body;

      if (!csvContent || typeof csvContent !== "string") {
        return res.status(400).json({ message: "CSV content is required" });
      }

      const activities = parseGarminCSV(csvContent, userId);

      if (activities.length === 0) {
        return res.status(400).json({ message: "No valid activities found in CSV" });
      }

      // Insert all activities
      const created = [];
      for (const activity of activities) {
        const result = await storage.createActivity(activity);
        created.push(result);
      }

      res.status(201).json({
        message: `Successfully imported ${created.length} activities`,
        activities: created,
      });
    } catch (error) {
      console.error("Error importing CSV:", error);
      res.status(500).json({
        message: "Failed to import CSV",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}
