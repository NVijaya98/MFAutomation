# IZWS Chat Batch Trigger

This starter project lets a chat service call a local endpoint with a command such as `execute pseudo batch`, or lets an operator launch the same flow from a built-in web UI with dropdowns. The backend maps the command to a predefined batch definition and hands the request to an IBM Z Workload Scheduler adapter.

Right now the scheduler adapter runs in `mock` mode because the mainframe connectivity details are not available yet. That is intentional: it gives you a stable contract now, so later we only need to replace the adapter implementation.

## Flow

1. User opens the local UI at `/` or a chat service sends `POST /chat/command`.
2. Request includes a shared secret in `x-chat-secret`.
3. The command router matches the phrase to a job definition.
4. The IZWS client receives the job launch request.
5. Once API or USS details are available, replace the mock branch in the client with the real launch call.

## Run

```bash
cp .env.example .env
export $(grep -v '^#' .env | xargs)
npm start
```

The service starts on `http://localhost:3000` unless you override `PORT`.

Open that URL to use the operator UI.

## Test

```bash
curl -X POST http://localhost:3000/chat/command \
  -H "Content-Type: application/json" \
  -H "x-chat-secret: change-me" \
  -d '{
    "command": "execute pseudo batch",
    "source": "teams-bot",
    "userId": "vijay"
  }'
```

Expected behavior for now: the command maps to `PSEUDOBAT` and returns `pending_configuration`.

## UI Endpoints

- `GET /` serves the launcher UI
- `GET /api/jobs` returns the configured job mappings for the dropdowns
- `GET /health` returns the current IZWS connection mode
- `POST /chat/command` accepts a chat or UI launch request

## Where To Wire IZWS

Update [src/scheduler/izwsClient.js](/Users/vijayadurganadipeneni/Documents/Codex/2026-04-24/i-want-to-run-mainframe-batch/src/scheduler/izwsClient.js) when you have one of these:

- IZWS REST API endpoint and authentication scheme
- USS command path and execution method
- Middleware service that can trigger scheduler jobs on your behalf

## Job Mapping

Update [src/jobs.js](/Users/vijayadurganadipeneni/Documents/Codex/2026-04-24/i-want-to-run-mainframe-batch/src/jobs.js) to add more chat phrases and map them to scheduler applications, operations, or job names.
