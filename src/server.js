const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { config } = require("./config");
const { IzwsClient } = require("./scheduler/izwsClient");
const { handleChatCommand } = require("./commandRouter");
const { listJobs } = require("./jobs");

const schedulerClient = new IzwsClient(config.izws);
const publicDir = path.join(__dirname, "..", "public");
const staticFiles = {
  "/": "index.html",
  "/styles.css": "styles.css",
  "/app.js": "app.js"
};

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
  if (!provided) {
    return false;
  }

  const expected = Buffer.from(config.chatSharedSecret);
  const actual = Buffer.from(String(provided));

  if (expected.length !== actual.length) {
    return false;
  }

  return crypto.timingSafeEqual(expected, actual);
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

const server = http.createServer(async (request, response) => {
  if (request.method === "GET" && staticFiles[request.url]) {
    sendStatic(response, staticFiles[request.url]);
    return;
  }

  if (request.method === "GET" && request.url === "/health") {
    sendJson(response, 200, {
      status: "ok",
      izwsConnectionMode: config.izws.connectionMode
    });
    return;
  }

  if (request.method === "GET" && request.url === "/api/jobs") {
    sendJson(response, 200, {
      jobs: listJobs()
    });
    return;
  }

  if (request.method === "POST" && request.url === "/chat/command") {
    if (!isAuthorized(request)) {
      sendJson(response, 401, { message: "Unauthorized" });
      return;
    }

    try {
      const payload = await collectJsonBody(request);
      const commandText = payload.command;

      if (!commandText) {
        sendJson(response, 400, { message: "Missing required field: command" });
        return;
      }

      const result = await handleChatCommand(commandText, schedulerClient, {
        requestedAt: new Date().toISOString(),
        source: payload.source || "chat-service",
        userId: payload.userId || "unknown-user"
      });

      sendJson(response, result.statusCode, result.body);
      return;
    } catch (error) {
      sendJson(response, 400, { message: error.message });
      return;
    }
  }

  sendJson(response, 404, { message: "Not found" });
});

server.listen(config.port, () => {
  console.log(`IZWS chat trigger listening on port ${config.port}`);
});
