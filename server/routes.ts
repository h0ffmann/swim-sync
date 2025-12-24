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
  // In production (REPLIT_DEPLOYMENT set), the run command handles spawning Python
  // In development, Node.js spawns Python
  const isProduction = process.env.REPLIT_DEPLOYMENT !== undefined;
  
  if (!isProduction) {
    // Development: spawn Python from Node.js
    startPythonBackend();
  } else {
    // Production: Python is started by the run command, just wait for it
    console.log("[python] Production mode - assuming Python is started by run command");
  }
  
  // Wait for Python to be ready (both dev and production)
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
      timeout: 120000,  // 2 minutes for large CSV imports
      proxyTimeout: 120000,
      onProxyReq: (proxyReq, req) => {
        // Set x-forwarded-host to the real public host for OAuth redirect_uri construction
        if (req.headers.host) {
          proxyReq.setHeader("x-forwarded-host", req.headers.host);
        }
      },
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
