import type { Express } from "express";
import type { Server } from "http";
import { createProxyMiddleware } from "http-proxy-middleware";
import { spawn, execSync } from "child_process";
import path from "path";
import { createConnection } from "net";

let pythonProcess: ReturnType<typeof spawn> | null = null;
let pythonReady = false;
let lastRestartAttempt = 0;
const RESTART_DELAY = 5000; // 5 second delay between restart attempts

function findPythonCommand(): string {
  const commands = ["python3", "python"];
  
  for (const cmd of commands) {
    try {
      execSync(`${cmd} --version`, { stdio: "ignore" });
      console.log(`[python] Found Python at: ${cmd}`);
      return cmd;
    } catch {
      // Continue to next
    }
  }
  
  return "python3";
}

async function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host: "127.0.0.1" });
    socket.setTimeout(1000);
    
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.once("error", () => {
      resolve(false);
    });
  });
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
    
    // Attempt restart with delay to let port be released
    const now = Date.now();
    if (code !== 0 && code !== null && now - lastRestartAttempt >= RESTART_DELAY) {
      lastRestartAttempt = now;
      console.error(`[python] Backend crashed, attempting restart in ${RESTART_DELAY}ms...`);
      setTimeout(() => {
        startPythonBackend();
      }, RESTART_DELAY);
    }
  });
}

async function waitForPython(maxWait = 15000): Promise<boolean> {
  const start = Date.now();
  
  while (Date.now() - start < maxWait) {
    if (pythonReady) return true;
    
    try {
      const response = await fetch("http://localhost:8000/api/health", { 
        signal: AbortSignal.timeout(1000)
      });
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
  // Check if Python is already running on port 8000
  const portInUse = await isPortInUse(8000);
  
  if (!portInUse) {
    // Only spawn Python if nothing is already listening on port 8000
    console.log("[python] Port 8000 is free, starting Python backend...");
    startPythonBackend();
  } else {
    console.log("[python] Port 8000 is already in use, assuming Python is running elsewhere");
    pythonReady = true; // Assume it's ready if something is already listening
  }
  
  // Wait for Python to be ready
  const ready = await waitForPython();
  if (ready) {
    console.log("[express] Python backend is ready");
  } else {
    console.warn("[express] Python backend not ready in time, will retry on requests");
  }

  // Proxy all /api requests to Python backend running on port 8000
  app.use(
    "/api",
    createProxyMiddleware({
      target: "http://localhost:8000",
      changeOrigin: true,
      pathRewrite: (path) => `/api${path}`,
      timeout: 10000,
      proxyTimeout: 10000,
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
