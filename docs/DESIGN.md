# Design notes

## Data model

- `posts`: immutable source material used by the generator.
- `variants`: one platform-specific content item per post and platform; status is draft, approved, rejected, or published.
- `schedules`: durable due time, deterministic idempotency key, retry count, and worker claim state.
- `publish_attempts`: append-only record of each success or failure.

## API surface

The API is documented in `README.md`. The main boundary is Express routes; business rules live in services; persistence is isolated in `db.js`; platform-specific calls live behind `SocialPublisher`.

## Explicit non-goal

A full analytics/engagement dashboard is not part of this capstone. The project focuses on review, scheduling, adapter isolation, and safe retries.

## Reliability note

The database uses a unique idempotency key per variant and schedule slot, a conditional processing claim, and a unique successful-attempt index. This protects the local workflow and mock adapters from duplicate attempts. A real external API must itself support idempotency to make exactly-once remote delivery provable. Telegram's `sendMessage` does not expose such a key, so ambiguous Telegram outcomes require operator inspection.
