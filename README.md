# IZWS Chat Batch Trigger

This starter project lets a chat service call a local endpoint with a command such as `execute pseudo batch`, or lets an operator launch the same flow from a built-in web UI with dropdowns. The backend maps the command to a predefined batch definition and hands the request to an IBM Z Workload Scheduler adapter.

Right now the scheduler adapter runs in `mock` mode because the mainframe connectivity details are not available yet. That is intentional: it gives you a stable contract now, so later we only need to replace the adapter implementation.

## Flow

1. User opens the local UI at `/` or a chat service sends `POST /chat/command`.
2. When the server starts, it asks you to enter a runtime shared secret in the terminal.
3. After the browser opens, the UI asks for the mainframe user ID and password for that browser session.
4. Each request includes the shared secret in `x-chat-secret` and sends the mainframe credentials in the request body.
5. The command router matches the phrase to a job definition.
6. The IZWS client receives the job launch request.
7. Once API or USS details are available, replace the mock branch in the client with the real launch call.

## Run

```bash
cp .env.example .env
export $(grep -v '^#' .env | xargs)
npm start
```

After `npm start`, the server prompts you in the terminal for the shared secret. That secret is kept only in memory for the current run.

The service starts on `http://localhost:3000` unless you override `PORT`.

Open that URL to use the operator UI. The first screen asks for your mainframe user ID and password, and those credentials are kept only in browser memory for the current tab session.

## Test

```bash
curl -X POST http://localhost:3000/chat/command \
  -H "Content-Type: application/json" \
  -H "x-chat-secret: YOUR_RUNTIME_SECRET" \
  -d '{
    "command": "execute pseudo batch",
    "source": "teams-bot",
    "userId": "vijay",
    "mainframeCredentials": {
      "userId": "MFUSER",
      "password": "YOUR_MAINFRAME_PASSWORD"
    }
  }'
```

Expected behavior for now: the command maps to `PSEUDOBAT` and returns `pending_configuration`.

## UI Endpoints

- `GET /` serves the launcher UI
- `GET /api/jobs` returns the configured job mappings for the dropdowns
- `GET /health` returns the current IZWS connection mode
- `POST /chat/command` accepts a chat or UI launch request

## Security Notes

- The shared secret is no longer stored in `.env.example` or shipped with a weak default.
- The server asks for the shared secret at startup and keeps it only in memory.
- The browser UI asks for mainframe user ID and password after the page opens and keeps them only in tab memory.
- `POST /chat/command` now has a simple in-memory rate limiter of 10 requests per minute per client IP.

## Connection Config

Use [.env.example](/Users/vijayadurganadipeneni/Documents/Codex/2026-04-24/i-want-to-run-mainframe-batch/.env.example) as the template for your real `.env`.

For API mode:

```env
IZWS_CONNECTION_MODE=api
IZWS_BASE_URL=https://your-mainframe-host
IZWS_PORT=9443
IZWS_AUTH_METHOD=basic
IZWS_API_PATH=/your/izws/api/path
IZWS_ENGINE_NAME=YOUR_ENGINE
```

For USS mode:

```env
IZWS_CONNECTION_MODE=uss
USS_HOST=your-mainframe-host
USS_PORT=22
USS_PROTOCOL=ssh
USS_COMMAND_PATH=/path/to/your/izws/or/trigger/script
USS_COMMAND_TEMPLATE=
```

## Where To Wire IZWS

Update [src/scheduler/izwsClient.js](/Users/vijayadurganadipeneni/Documents/Codex/2026-04-24/i-want-to-run-mainframe-batch/src/scheduler/izwsClient.js) when you have one of these:

- IZWS REST API endpoint and authentication scheme
- USS command path and execution method
- Middleware service that can trigger scheduler jobs on your behalf

If you only have USS and no API:

1. Set `IZWS_CONNECTION_MODE=uss` in your `.env`
2. Fill in `USS_HOST`, `USS_PORT`, `USS_PROTOCOL`, and `USS_COMMAND_PATH`
3. Implement the real command execution inside the `startJobViaUss()` method in [src/scheduler/izwsClient.js](/Users/vijayadurganadipeneni/Documents/Codex/2026-04-24/i-want-to-run-mainframe-batch/src/scheduler/izwsClient.js)
4. Use the entered browser credentials as the login identity for the USS session

In the current code, `startJobViaUss()` is the exact place to add your SSH or remote command logic.

## Job Mapping

Update [src/jobs.js](/Users/vijayadurganadipeneni/Documents/Codex/2026-04-24/i-want-to-run-mainframe-batch/src/jobs.js) to add more chat phrases and map them to scheduler applications, operations, or job names.
