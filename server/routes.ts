import type { Express } from "express";
import type { Server } from "http";
import { createProxyMiddleware } from "http-proxy-middleware";
import { spawn } from "child_process";

let pythonProcess: ReturnType<typeof spawn> | null = null;

function startPythonBackend() {
  if (pythonProcess) return;

  console.log("[python] Starting Python backend on port 8000...");
  
  pythonProcess = spawn("python", ["run_backend.py"], {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
  });

  pythonProcess.stdout?.on("data", (data) => {
    const lines = data.toString().trim().split("\n");
    lines.forEach((line: string) => {
      console.log("[python]", line);
      if (line.includes("Application startup complete")) {
        console.log("[python] Backend ready");
      }
    });
  });

  pythonProcess.stderr?.on("data", (data) => {
    const msg = data.toString().trim();
    console.error("[python]", msg);
  });

  pythonProcess.on("error", (err) => {
    console.error("[python] Failed to start:", err.message);
    pythonProcess = null;
  });

  pythonProcess.on("exit", (code, signal) => {
    console.log(`[python] Process exited with code ${code}, signal ${signal}`);
    pythonProcess = null;
    
    if (code !== 0 && code !== null) {
      console.error("[python] Backend crashed, attempting restart in 3s...");
      setTimeout(() => {
        startPythonBackend();
      }, 3000);
    }
  });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Start Python backend
  startPythonBackend();

  // Wait a moment for Python to start
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Proxy all /api requests to Python backend running on port 8000
  // Add /api prefix back when forwarding
  app.use(
    "/api",
    createProxyMiddleware({
      target: "http://localhost:8000",
      changeOrigin: true,
      pathRewrite: (path) => `/api${path}`,
      on: {
        error: (err, req, res) => {
          console.error("[proxy] Error:", err.message);
          if (res && !res.headersSent && "writeHead" in res) {
            (res as any).writeHead(502, { "Content-Type": "application/json" });
            (res as any).end(JSON.stringify({ error: "Python backend unavailable" }));
          }
        },
      },
    })
  );

  return httpServer;
}
