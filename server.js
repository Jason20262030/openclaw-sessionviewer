const http = require("http");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 4588);
const WEB_ROOT = path.join(__dirname, "public");
const OPENCLAW_DIR =
  process.env.OPENCLAW_DIR || path.join(os.homedir(), ".openclaw");
const AGENTS_DIR = path.join(OPENCLAW_DIR, "agents");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function sanitizeAgentName(value) {
  if (!value) return "";
  return String(value).trim();
}

function sanitizeRelativeSessionPath(value) {
  if (!value) return "";
  const normalized = String(value).replace(/\\/g, "/").trim();
  if (!normalized || normalized.startsWith("/") || normalized.includes("..")) {
    return "";
  }
  return normalized;
}

async function fileExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

function analyzeSessionText(rawText) {
  const lines = rawText === "" ? [] : rawText.split(/\r?\n/);
  const lineCount = lines.length;

  try {
    const jsonValue = JSON.parse(rawText);
    return {
      lineCount,
      parseMode: "json",
      parsedEntries: [{ line: 1, value: jsonValue }],
      parseErrors: [],
    };
  } catch {
    // Not a single JSON document; continue with JSONL parsing.
  }

  const parsedEntries = [];
  const parseErrors = [];

  lines.forEach((line, index) => {
    if (line.trim() === "") return;
    try {
      parsedEntries.push({
        line: index + 1,
        value: JSON.parse(line),
      });
    } catch (error) {
      parseErrors.push({
        line: index + 1,
        message: String(error && error.message ? error.message : error),
      });
    }
  });

  if (parsedEntries.length > 0) {
    return {
      lineCount,
      parseMode: "jsonl_attempted",
      parsedEntries,
      parseErrors,
    };
  }

  return {
    lineCount,
    parseMode: "raw_only",
    parsedEntries: [],
    parseErrors: [],
  };
}

async function collectSessionStats(filePath) {
  const rawText = await fs.readFile(filePath, "utf-8");
  const analyzed = analyzeSessionText(rawText);
  return {
    lineCount: analyzed.lineCount,
    parseErrorCount: analyzed.parseErrors.length,
  };
}

async function listSessionFilesRecursive(baseDir, currentDir = baseDir) {
  const items = [];
  const entries = await fs.readdir(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      const nested = await listSessionFilesRecursive(baseDir, fullPath);
      items.push(...nested);
      continue;
    }
    if (!entry.isFile()) continue;

    const relativePath = path.relative(baseDir, fullPath).split(path.sep).join("/");
    const stat = await fs.stat(fullPath);
    const stats = await collectSessionStats(fullPath);
    items.push({
      name: entry.name,
      relativePath,
      size: stat.size,
      updatedAt: stat.mtime.toISOString(),
      lineCount: stats.lineCount,
      parseErrorCount: stats.parseErrorCount,
    });
  }

  items.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return items;
}

async function buildAgentSessionTree() {
  const rootExists = await fileExists(AGENTS_DIR);
  if (!rootExists) {
    return {
      openclawDir: OPENCLAW_DIR,
      agents: [],
    };
  }

  const entries = await fs.readdir(AGENTS_DIR, { withFileTypes: true });
  const agents = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const agentName = entry.name;
    const sessionRoot = path.join(AGENTS_DIR, agentName, "sessions");
    const hasSessionDir = await fileExists(sessionRoot);
    if (!hasSessionDir) {
      agents.push({
        agent: agentName,
        sessions: [],
      });
      continue;
    }

    const sessions = await listSessionFilesRecursive(sessionRoot);
    agents.push({
      agent: agentName,
      sessions,
    });
  }

  agents.sort((a, b) => a.agent.localeCompare(b.agent));
  return {
    openclawDir: OPENCLAW_DIR,
    agents,
  };
}

async function readSessionFile(agentName, relativeSessionPath) {
  const safeAgentName = sanitizeAgentName(agentName);
  const safeRelativePath = sanitizeRelativeSessionPath(relativeSessionPath);
  if (!safeAgentName || !safeRelativePath) {
    throw new Error("invalid_params");
  }

  const sessionFilePath = path.join(AGENTS_DIR, safeAgentName, "sessions", safeRelativePath);
  const expectedBase = path.join(AGENTS_DIR, safeAgentName, "sessions");
  const resolvedBase = path.resolve(expectedBase);
  const resolvedTarget = path.resolve(sessionFilePath);
  if (!resolvedTarget.startsWith(resolvedBase)) {
    throw new Error("invalid_path");
  }

  const exists = await fileExists(resolvedTarget);
  if (!exists) {
    throw new Error("not_found");
  }

  const stat = await fs.stat(resolvedTarget);
  const rawText = await fs.readFile(resolvedTarget, "utf-8");
  const analyzed = analyzeSessionText(rawText);
  return {
    meta: {
      agent: safeAgentName,
      relativePath: safeRelativePath,
      absolutePath: resolvedTarget,
      size: stat.size,
      updatedAt: stat.mtime.toISOString(),
      lineCount: analyzed.lineCount,
      parseMode: analyzed.parseMode,
      parsedCount: analyzed.parsedEntries.length,
      parseErrorCount: analyzed.parseErrors.length,
    },
    parsedEntries: analyzed.parsedEntries,
    parseErrors: analyzed.parseErrors,
    rawText,
  };
}

async function serveStatic(reqPath, res) {
  const relative = reqPath === "/" ? "/index.html" : reqPath;
  const safePath = path.normalize(relative).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(WEB_ROOT, safePath);

  const resolvedRoot = path.resolve(WEB_ROOT);
  const resolvedTarget = path.resolve(filePath);
  if (!resolvedTarget.startsWith(resolvedRoot)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const data = await fs.readFile(resolvedTarget);
    const ext = path.extname(resolvedTarget).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const reqUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (reqUrl.pathname === "/api/tree") {
      const payload = await buildAgentSessionTree();
      sendJson(res, 200, payload);
      return;
    }

    if (reqUrl.pathname === "/api/session") {
      const agent = reqUrl.searchParams.get("agent");
      const file = reqUrl.searchParams.get("file");
      if (!agent || !file) {
        sendJson(res, 400, { error: "Missing agent or file parameter." });
        return;
      }

      try {
        const payload = await readSessionFile(agent, file);
        sendJson(res, 200, payload);
      } catch (error) {
        const code = String(error && error.message ? error.message : error);
        if (code === "not_found") {
          sendJson(res, 404, { error: "Session file not found." });
          return;
        }
        if (code === "invalid_params" || code === "invalid_path") {
          sendJson(res, 400, { error: "Invalid parameters." });
          return;
        }
        throw error;
      }
      return;
    }

    await serveStatic(reqUrl.pathname, res);
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(
      JSON.stringify({
        error: "Internal server error",
        detail: String(error && error.message ? error.message : error),
      }),
    );
  }
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[sessionviewer] open http://localhost:${PORT}`);
  // eslint-disable-next-line no-console
  console.log(`[sessionviewer] scanning: ${OPENCLAW_DIR}`);
});
