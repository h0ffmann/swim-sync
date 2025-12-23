import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // Try multiple possible locations for the dist folder
  const possiblePaths = [
    path.resolve(__dirname, "public"),
    path.resolve(__dirname, "../dist/public"),
    path.resolve(process.cwd(), "dist/public"),
  ];

  let distPath: string | null = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      distPath = p;
      console.log(`[static] Found dist directory at: ${p}`);
      break;
    }
  }

  if (!distPath) {
    console.error(`[static] Could not find dist directory. Tried:`);
    possiblePaths.forEach((p) => console.error(`  - ${p}`));
    throw new Error(
      `Could not find the build directory. Tried: ${possiblePaths.join(", ")}`
    );
  }

  // Serve static files
  app.use(express.static(distPath, { maxAge: "1h" }));

  // Serve index.html for all routes (SPA fallback)
  const indexPath = path.resolve(distPath, "index.html");
  if (!fs.existsSync(indexPath)) {
    console.error(`[static] index.html not found at ${indexPath}`);
    throw new Error(`index.html not found at ${indexPath}`);
  }

  app.use("*", (_req, res) => {
    res.sendFile(indexPath);
  });
}
