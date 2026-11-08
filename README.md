# Social Media Studio

**FlyRank Internship · Backend Track · Capstone**

Turn one blog post into a platform-specific social campaign. The service stores one source post, generates constrained variants, requires human approval, schedules publication, and records every publish attempt.

> This repository implements the current **Social Media Studio** brief. It does not depend on `starters/challenge-5-social/` or any FlyRank-provided server. Mock adapters are implemented locally; Telegram is the real free publishing adapter.

## Features

- Ingest a post as Markdown text or fetch an HTTP(S) article URL.
- Generate Telegram, X-style, and LinkedIn-style variants from the stored source post.
- Enforce platform maximum length and hashtag-count rules in code.
- Edit, approve, or reject each variant. Only approved variants can be scheduled.
- Publish through one `SocialPublisher` interface: Telegram, Mock X, and Mock LinkedIn.
- Persist schedules, attempts, statuses, and publish history in SQLite.
- Use a unique `(variant, scheduled time)` idempotency key and a database claim to prevent concurrent duplicate mock publishes.
- Run a persistent polling scheduler that resumes due work after restart.
- Keep credentials in `.env`; `.env` and the SQLite database are ignored by Git.

## Architecture

```text
 Markdown / Article URL
          |
          v
     Post Ingestion ------> SQLite: posts (source of truth)
          |
          v
   Variant Generator -----> Constraint Validator
          |                         |
          +-------------------------+
          |
          v
  Review: draft / approved / rejected
          |
          v
  Durable Schedule Store (SQLite)
          |
          v
  Scheduler Worker ---> SocialPublisher interface
                         |          |          |
                      Telegram   Mock X   Mock LinkedIn
                         |          |          |
                         +----------+----------+
                                    |
                                    v
                         Publish Attempts / History
```

### Project structure

```text
src/
  adapters/       SocialPublisher interface and concrete adapters
  routes/         HTTP API routes
  services/       generation, validation, scheduling and publishing
  app.js          Express application
  db.js           SQLite schema and connection
  server.js       HTTP server + scheduler
  worker.js       Standalone scheduler process
  seed.js         Sample campaign data
 test/            Automated tests
 docs/            Design notes and API examples
```

## Requirements

- Node.js 20 or newer
- npm
- For real publishing: a Telegram bot and a channel/group where the bot is allowed to post

No paid service or credit card is required. Mock adapters work without any social account.

## Run locally

```bash
cp .env.example .env
npm install
npm run seed
npm start
```

Open `http://localhost:3000` and check `http://localhost:3000/api/health`.

The API server starts the scheduler automatically. If you prefer a separate worker process, use `npm run worker` in a second terminal and remove `startScheduler()` from `src/server.js` to avoid running two workers.

### Docker

```bash
docker compose up --build
```

The service is available at `http://localhost:3000`. To add sample data:

```bash
docker compose exec app npm run seed
```

## Telegram setup (real platform)

1. Create a bot with Telegram's official BotFather.
2. Add the bot to a channel or group and grant permission to send messages.
3. Copy `.env.example` to `.env`.
4. Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in `.env`.
5. Restart the application. Do not commit `.env` or paste the token into source code.

The Telegram adapter calls the official `sendMessage` endpoint. It recognises HTTP 429 and uses Telegram's `retry_after` value to defer the next attempt. A Telegram message can only be published to an account/channel you control or are authorised to use.

**Important delivery limitation:** Telegram's `sendMessage` API does not accept a client idempotency key. The application prevents duplicate local scheduling and concurrent execution, and mock publishing is repeat-safe. However, no client can prove exactly-once delivery to Telegram across the narrow failure case where Telegram accepts a message but the network drops before the response reaches this service. If a Telegram attempt becomes ambiguous after a crash/timeout, inspect the channel and publish history before manually retrying. This limitation is documented rather than hidden.

## API reference

All request and response bodies are JSON. Base URL: `http://localhost:3000/api`.

### 1. Health

```http
GET /api/health
```

### 2. Ingest Markdown or URL

Markdown:

```bash
curl -X POST http://localhost:3000/api/posts \
  -H 'content-type: application/json' \
  -d '{"title":"Reliable publishing","body":"A single source post can become several platform-specific updates."}'
```

URL:

```bash
curl -X POST http://localhost:3000/api/posts \
  -H 'content-type: application/json' \
  -d '{"title":"Article title","url":"https://example.com/article"}'
```

URL ingestion fetches the page and stores a plain-text extraction. The stored body is the source of truth for later generation. Only use URLs you are authorised to retrieve.

### 3. Generate platform variants

```bash
curl -X POST http://localhost:3000/api/posts/POST_ID/generate
```

Creates one `telegram`, `mock_x`, and `mock_linkedin` variant. Repeating the request returns the existing variants rather than creating duplicates.

### 4. Review a variant

Approve:

```bash
curl -X PATCH http://localhost:3000/api/variants/VARIANT_ID \
  -H 'content-type: application/json' -d '{"action":"approve"}'
```

Edit (editing returns it to `draft`):

```bash
curl -X PATCH http://localhost:3000/api/variants/VARIANT_ID \
  -H 'content-type: application/json' \
  -d '{"action":"edit","content":"Revised post text #Content"}'
```

Reject:

```bash
curl -X PATCH http://localhost:3000/api/variants/VARIANT_ID \
  -H 'content-type: application/json' -d '{"action":"reject"}'
```

### 5. Schedule and publish

Only an approved variant can be scheduled. Use an ISO-8601 timestamp with timezone, for example:

```bash
curl -X POST http://localhost:3000/api/variants/VARIANT_ID/schedule \
  -H 'content-type: application/json' \
  -d '{"scheduledAt":"2027-01-01T12:00:00.000Z"}'
```

For a fast demo, set `scheduledAt` to a timestamp a few seconds in the future. The scheduler checks for due jobs every `SCHEDULER_POLL_MS` milliseconds (default 5000). For an immediate manual attempt:

```bash
curl -X POST http://localhost:3000/api/schedules/SCHEDULE_ID/publish
```

### 6. Inspect results

```http
GET /api/posts
GET /api/posts/POST_ID
GET /api/variants
GET /api/schedules
GET /api/history
```

Full request examples are also in [`docs/API_EXAMPLES.md`](docs/API_EXAMPLES.md).

## Platform constraint profiles

| Platform | Maximum characters | Maximum hashtags | Tone |
|---|---:|---:|---|
| Telegram | 4,000 | 5 | Conversational and clear |
| Mock X | 280 | 2 | Concise and engaging |
| Mock LinkedIn | 3,000 | 5 | Professional and insightful |

The code enforces length, non-empty content, and hashtag count. AI generation is intentionally optional; this project uses deterministic templates so the rules are testable without API keys or cost.

## Tests

```bash
npm test
```

Tests cover platform length limits, hashtag limits, generation from the stored source post, unknown post handling, and duplicate mock publish prevention. Add and run the remaining acceptance tests described in `EVIDENCE.md` before final grading.

## Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `PORT` | HTTP port | `3000` |
| `DATABASE_PATH` | SQLite file | `./data/social-studio.db` |
| `PUBLISHER_DEFAULT` | Reserved configuration setting | `mock_x` |
| `SCHEDULER_POLL_MS` | Scheduler polling interval | `5000` |
| `TELEGRAM_BOT_TOKEN` | Telegram bot credential | unset |
| `TELEGRAM_CHAT_ID` | Destination channel/chat | unset |

## Known limitations

- The included dashboard is intentionally lightweight; it supports creating posts, reviewing variants, scheduling, and inspecting history.
- The templates are deterministic; AI-assisted copywriting is optional and not configured.
- URL extraction is deliberately lightweight and is not a full article-reader/parser.
- Telegram does not provide a remote idempotency-key facility. Exactly-once external delivery cannot be guaranteed across an ambiguous network failure; check the destination before retrying such an attempt.
- Mock X and Mock LinkedIn record simulated publishing results locally; they do not contact those platforms.
- Authentication and multi-user roles are outside this capstone's current scope. Do not expose this development service publicly without adding authentication and deployment hardening.

## Submission checklist

- [ ] Push this project to a dedicated **public** GitHub repository named `flyrank-capstone-social-studio`.
- [ ] Keep `.env`, database files, and real tokens out of Git.
- [ ] Run `npm test` and paste the actual output into `EVIDENCE.md`.
- [ ] Configure Telegram and publish a real test message to a destination you control.
- [ ] Capture actual command/API output for the evidence items; do not claim a test or live post that you have not run.
- [ ] Complete `BUILDLOG.md` with your own AI-use notes and review the code so you can explain it.
- [ ] Submit the public GitHub URL in the FlyRank portal. The brief says not to upload a ZIP to the portal.
