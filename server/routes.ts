import type { Express } from "express";
import type { Server } from "http";
import { createProxyMiddleware } from "http-proxy-middleware";
import { spawn, execSync } from "child_process";
import path from "path";

let pythonProcess: ReturnType<typeof spawn> | null = null;
let pythonReady = false;

function findPythonCommand(): string {
  // Try different Python commands
  const commands = ["python3", "python", "/nix/store/python3/bin/python3"];
  
  for (const cmd of commands) {
    try {
      execSync(`${cmd} --version`, { stdio: "ignore" });
      console.log(`[python] Found Python at: ${cmd}`);
      return cmd;
    } catch {
      // Continue to next
    }
  }
  
  // Default fallback
  return "python3";
}

function startPythonBackend() {
  if (pythonProcess) return;

  const pythonCmd = findPythonCommand();
  const workDir = process.cwd();
  const scriptPath = path.join(workDir, "run_backend.py");
  
  console.log(`[python] Starting Python backend on port 8000...`);
  console.log(`[python] Working directory: ${workDir}`);
  console.log(`[python] Script path: ${scriptPath}`);
  console.log(`[python] Python command: ${pythonCmd}`);
  
  pythonProcess = spawn(pythonCmd, [scriptPath], {
    cwd: workDir,
    stdio: ["ignore", "pipe", "pipe"],
    env: { 
      ...process.env,
      PYTHONUNBUFFERED: "1",
    },
  });

  pythonProcess.stdout?.on("data", (data) => {
    const lines = data.toString().trim().split("\n");
    lines.forEach((line: string) => {
      console.log("[python]", line);
      if (line.includes("Application startup complete") || line.includes("Uvicorn running")) {
        pythonReady = true;
        console.log("[python] Backend ready");
      }
    });
  });

  pythonProcess.stderr?.on("data", (data) => {
    const msg = data.toString().trim();
    // Uvicorn logs to stderr by default
    console.log("[python]", msg);
    if (msg.includes("Application startup complete") || msg.includes("Uvicorn running")) {
      pythonReady = true;
      console.log("[python] Backend ready");
    }
  });

  pythonProcess.on("error", (err) => {
    console.error("[python] Failed to start:", err.message);
    pythonProcess = null;
    pythonReady = false;
  });

  pythonProcess.on("exit", (code, signal) => {
    console.log(`[python] Process exited with code ${code}, signal ${signal}`);
    pythonProcess = null;
    pythonReady = false;
    
    if (code !== 0 && code !== null) {
      console.error("[python] Backend crashed, attempting restart in 3s...");
      setTimeout(() => {
        startPythonBackend();
      }, 3000);
    }
  });
}

async function waitForPython(maxWait = 15000): Promise<boolean> {
  const start = Date.now();
  
  while (Date.now() - start < maxWait) {
    if (pythonReady) return true;
    
    // Also try to connect
    try {
      const response = await fetch("http://localhost:8000/api/health");
      if (response.ok) {
        pythonReady = true;
        return true;
      }
    } catch {
      // Not ready yet
    }
    
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  
  return false;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Start Python backend
  startPythonBackend();

  // Wait for Python to be ready
  const ready = await waitForPython();
  if (ready) {
    console.log("[express] Python backend is ready");
  } else {
    console.error("[express] Python backend did not start in time, continuing anyway...");
  }

  // Proxy all /api requests to Python backend running on port 8000
  app.use(
    "/api",
    createProxyMiddleware({
      target: "http://localhost:8000",
      changeOrigin: true,
      pathRewrite: (path) => `/api${path}`,
      on: {
        error: (err, req, res) => {
          console.error("[proxy] Error:", err.message);
          if (res && "writeHead" in res && !(res as any).headersSent) {
            (res as any).writeHead(502, { "Content-Type": "application/json" });
            (res as any).end(JSON.stringify({ error: "Python backend unavailable" }));
          }
        },
      },
    })
  );

  return httpServer;
}
