# Build log and AI-use disclosure

This project was prepared with AI assistance. The repository owner must review, run, understand, and update this log before submission.

## AI assistance

- AI helped draft the initial project structure, Express routes, SQLite schema, adapter classes, documentation, and starter tests.
- AI helped identify the current capstone version from the supplied brief and excluded the obsolete fake-server dependency.

## Human review required

- Verify every endpoint and test locally.
- Configure and test Telegram using a bot and destination you control.
- Review URL-ingestion security and deployment exposure before hosting publicly.
- Understand the idempotency and Telegram delivery limitation documented in the README and design notes.
- Replace pending evidence with actual outputs.

## Corrections / decisions

- The old brief referenced a FlyRank fake server that the updated notice says does not exist. This implementation follows the current Social Media Studio brief and creates its own mock X and Mock LinkedIn adapters.
- Telegram's `sendMessage` endpoint does not accept a client idempotency key. The implementation does not claim exactly-once remote delivery in ambiguous timeout/crash scenarios; the limitation is documented for honest evaluation.

## Owner's notes (complete before submission)

- What I changed after reviewing the AI-generated code:
  - TODO
- Two or three code paths I can explain to an evaluator:
  - TODO
- Tests I personally ran and verified:
  - TODO
