# Evidence log

> This file is a submission template with test commands and expected checks. Replace each `PENDING` entry with real output from your machine before submitting. Do not present expected output as an executed test.

## Requirement evidence

| Requirement | Proof to capture | Status |
|---|---|---|
| Ingestion and source of truth | `POST /api/posts`, then `GET /api/posts/ID`; show stored title/body | PENDING — run locally |
| Constraint profiles | Run `npm test`; include over-length and excess-hashtag test output | PENDING — run locally |
| Review workflow | Attempt schedule while draft; capture HTTP 409; approve and schedule successfully | PENDING — run locally |
| Adapter architecture | Publish an approved variant using `mock_x`, then use `mock_linkedin`; show adapter classes and history | PENDING — run locally |
| Idempotent publishing | Publish same schedule twice; show one success row in `publish_attempts` | PENDING — run locally |
| Durable scheduling | Schedule for the future, stop/restart service, inspect schedule and history | PENDING — run locally |
| Publish history | `GET /api/history` after successful and failed attempts | PENDING — run locally |
| Secrets clean | `git status --ignored` and verify `.env` is ignored; confirm `.env.example` contains placeholders only | PENDING — run locally |
| Real platform publish | Publish a Telegram test message to a channel you control; record message ID and timestamp (never include token) | PENDING — configure Telegram |

## Automated test command

```bash
npm test
```

Paste the actual test runner output below after running it:

```text
PENDING: paste actual npm test output here
```

## Manual acceptance transcript

Paste real `curl` commands and responses here after completing the README workflow. Redact personal channel identifiers if desired. Never paste a bot token.
