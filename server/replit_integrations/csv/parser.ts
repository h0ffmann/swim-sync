import { parse } from "csv-parse/sync";
import type { InsertActivity } from "@shared/schema";

interface GarminRow {
  "Activity Type": string;
  Date: string;
  Distance: string;
  Time: string;
  "Avg HR": string;
  "Max HR": string;
  "Avg Pace": string;
  "Total Strokes": string;
  Title: string;
}

function timeToSeconds(timeStr: string): number {
  const parts = timeStr.split(":");
  if (parts.length === 3) {
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseInt(parts[2], 10);
    return hours * 3600 + minutes * 60 + seconds;
  }
  return 0;
}

function parseDistance(distStr: string): number {
  return Math.round(parseFloat(distStr.replace(/,/g, "")));
}

function parsePace(paceStr: string): number | undefined {
  if (!paceStr || paceStr === "--") return undefined;
  const parts = paceStr.split(":");
  if (parts.length === 2) {
    const minutes = parseInt(parts[0], 10);
    const seconds = parseInt(parts[1], 10);
    return minutes * 60 + seconds;
  }
  return undefined;
}

function parseHeartRate(hrStr: string): number | undefined {
  if (!hrStr || hrStr === "--") return undefined;
  const hr = parseInt(hrStr, 10);
  return isNaN(hr) ? undefined : hr;
}

export function parseGarminCSV(csvContent: string, userId: string): InsertActivity[] {
  const rows = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  }) as GarminRow[];

  return rows
    .map((row) => {
      const activityType = row["Activity Type"];
      const isOpenWater = activityType.includes("Open Water");
      const isPool = activityType.includes("Pool");

      if (!isOpenWater && !isPool) {
        return null;
      }

      const date = new Date(row.Date);
      if (isNaN(date.getTime())) {
        return null;
      }

      const duration = timeToSeconds(row.Time);
      if (duration === 0) {
        return null;
      }

      const distance = parseDistance(row.Distance);
      if (distance === 0) {
        return null;
      }

      // Infer stroke type (default to freestyle for imported data)
      const stroke = "freestyle";

      // Parse optional fields
      const heartRateAvg = parseHeartRate(row["Avg HR"]);
      const pace = parsePace(row["Avg Pace"]);

      const activity: InsertActivity = {
        userId,
        type: isOpenWater ? "open_water" : "pool",
        date,
        duration,
        distance,
        stroke,
        poolLength: isPool ? 50 : undefined, // Default pool length, can be adjusted
        pace,
        heartRateAvg,
        notes: row.Title ? `Imported: ${row.Title}` : "Imported from Garmin",
      };

      return activity;
    })
    .filter((activity): activity is InsertActivity => activity !== null);
}
