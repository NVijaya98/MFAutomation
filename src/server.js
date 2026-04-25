const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const readline = require("readline/promises");
const { config } = require("./config");
const { IzwsClient } = require("./scheduler/izwsClient");
const { handleChatCommand } = require("./commandRouter");
const { listJobs, findJobById } = require("./jobs");

const schedulerClient = new IzwsClient(config.izws);
const publicDir = path.join(__dirname, "..", "public");
const rateLimitWindowMs = 60 * 1000;
const maxRequestsPerWindow = 10;
const requestLog = new Map();
const staticFiles = {
  "/": "index.html",
  "/styles.css": "styles.css",
  "/app.js": "app.js"
};
let runtimeChatSecret = "";

function contentTypeFor(filePath) {
  if (filePath.endsWith(".html")) {
    return "text/html; charset=utf-8";
  }

  if (filePath.endsWith(".css")) {
    return "text/css; charset=utf-8";
  }

  if (filePath.endsWith(".js")) {
    return "application/javascript; charset=utf-8";
  }

  return "application/octet-stream";
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json" });
  response.end(JSON.stringify(payload, null, 2));
}

function sendStatic(response, fileName) {
  const filePath = path.join(publicDir, fileName);

  try {
    const content = fs.readFileSync(filePath);
    response.writeHead(200, { "Content-Type": contentTypeFor(filePath) });
    response.end(content);
  } catch (error) {
    sendJson(response, 500, { message: "Unable to load UI asset." });
  }
}

function isAuthorized(request) {
  const provided = request.headers["x-chat-secret"];
  if (!provided || !runtimeChatSecret) {
    return false;
  }

  const expected = Buffer.from(runtimeChatSecret);
  const actual = Buffer.from(String(provided));

  if (expected.length !== actual.length) {
    return false;
  }

  return crypto.timingSafeEqual(expected, actual);
}

function getClientKey(request) {
  const forwardedFor = request.headers["x-forwarded-for"];
  if (forwardedFor) {
    return String(forwardedFor).split(",")[0].trim();
  }

  return request.socket.remoteAddress || "unknown";
}

function isRateLimited(request) {
  const now = Date.now();
  const clientKey = getClientKey(request);
  const entry = requestLog.get(clientKey);

  if (!entry || now > entry.resetAt) {
    requestLog.set(clientKey, {
      count: 1,
      resetAt: now + rateLimitWindowMs
    });
    return false;
  }

  entry.count += 1;
  return entry.count > maxRequestsPerWindow;
}

function isLoopbackRequest(request) {
  const remoteAddress = request.socket.remoteAddress || "";
  return (
    remoteAddress === "127.0.0.1" ||
    remoteAddress === "::1" ||
    remoteAddress === "::ffff:127.0.0.1"
  );
}

async function promptForSecret() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    while (!runtimeChatSecret) {
      const entered = (await rl.question("Enter runtime chat shared secret: ")).trim();

      if (entered.length < 12) {
        console.log("Secret must be at least 12 characters. Please enter a stronger value.");
        continue;
      }

      runtimeChatSecret = entered;
    }
  } finally {
    rl.close();
  }
}

function collectJsonBody(request) {
  return new Promise((resolve, reject) => {
    let rawBody = "";

    request.on("data", (chunk) => {
      rawBody += chunk;
    });

    request.on("end", () => {
      if (!rawBody) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(rawBody));
      } catch (error) {
        reject(new Error("Request body must be valid JSON."));
      }
    });

    request.on("error", reject);
  });
}

async function processLaunchRequest(payload, response, requestContextOverrides = {}) {
  const commandText = payload.command;
  const action = payload.action || "execute";
  const jobId = payload.jobId || "";
  const mainframeCredentials = payload.mainframeCredentials || {};

  if (!mainframeCredentials.userId || !mainframeCredentials.password) {
    sendJson(response, 400, {
      message: "Missing required mainframe credentials: userId and password"
    });
    return;
  }

  const mainframeUserId = String(mainframeCredentials.userId);
  const launchContext = {
    requestContext: {
      requestedAt: new Date().toISOString(),
      source: requestContextOverrides.source || payload.source || "chat-service",
      userId: requestContextOverrides.userId || payload.userId || mainframeUserId
    },
    mainframeCredentials: {
      userId: mainframeUserId,
      password: String(mainframeCredentials.password)
    }
  };

  if (action === "listSchedulerJobs") {
    const schedulerResult = await schedulerClient.listSchedulerJobs(launchContext);
    sendJson(response, schedulerResult.status === "configuration_error" ? 500 : 200, {
      message: "Scheduler job list retrieved.",
      schedulerResult
    });
    return;
  }

  const selectedJob = findJobById(jobId);
  if (!selectedJob && !commandText) {
    sendJson(response, 400, { message: "Missing required field: jobId or command" });
    return;
  }

  const result = selectedJob
    ? await handleChatCommand(selectedJob.defaultCommand || commandText, schedulerClient, launchContext)
    : await handleChatCommand(commandText, schedulerClient, launchContext);

  sendJson(response, result.statusCode, result.body);
}

const server = http.createServer(async (request, response) => {
  if (request.method === "GET" && staticFiles[request.url]) {
    sendStatic(response, staticFiles[request.url]);
    return;
  }

  if (request.method === "GET" && request.url === "/health") {
    sendJson(response, 200, {
      status: "ok",
      izwsConnectionMode: config.izws.connectionMode,
      requiresMainframeCredentials: true
    });
    return;
  }

  if (request.method === "GET" && request.url === "/api/jobs") {
    sendJson(response, 200, {
      jobs: listJobs()
    });
    return;
  }

  if (request.method === "POST" && request.url === "/ui/launch") {
    if (!isLoopbackRequest(request)) {
      sendJson(response, 403, {
        message: "UI launch endpoint is restricted to local requests."
      });
      return;
    }

    if (isRateLimited(request)) {
      sendJson(response, 429, {
        message: "Too many requests. Please wait a minute and try again."
      });
      return;
    }

    try {
      const payload = await collectJsonBody(request);
      await processLaunchRequest(payload, response, {
        source: "operator-ui"
      });
      return;
    } catch (error) {
      sendJson(response, 400, { message: error.message });
      return;
    }
  }

  if (request.method === "POST" && request.url === "/chat/command") {
    if (isRateLimited(request)) {
      sendJson(response, 429, {
        message: "Too many requests. Please wait a minute and try again."
      });
      return;
    }

    if (!isAuthorized(request)) {
      sendJson(response, 401, { message: "Unauthorized" });
      return;
    }

    try {
      const payload = await collectJsonBody(request);
      await processLaunchRequest(payload, response);
      return;
    } catch (error) {
      sendJson(response, 400, { message: error.message });
      return;
    }
  }

  sendJson(response, 404, { message: "Not found" });
});

async function startServer() {
  await promptForSecret();

  server.listen(config.port, () => {
    console.log(`IZWS chat trigger listening on port ${config.port}`);
  });
}

startServer().catch((error) => {
  console.error("Unable to start server:", error.message);
  process.exit(1);
});
