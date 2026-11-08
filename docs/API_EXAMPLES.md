# API examples

Use `BASE=http://localhost:3000/api` and replace IDs with values returned by the API.

```bash
# Create a post
curl -sS -X POST "$BASE/posts" -H 'content-type: application/json' \
  -d '{"title":"Backend reliability","body":"Retries should not create duplicate work. Durable storage helps workers resume safely."}'

# Generate variants
curl -sS -X POST "$BASE/posts/POST_ID/generate"

# Approve one variant
curl -sS -X PATCH "$BASE/variants/VARIANT_ID" -H 'content-type: application/json' \
  -d '{"action":"approve"}'

# Schedule it
curl -sS -X POST "$BASE/variants/VARIANT_ID/schedule" -H 'content-type: application/json' \
  -d '{"scheduledAt":"2027-01-01T12:00:00.000Z"}'

# Check history
curl -sS "$BASE/history"
```

Expected workflow: `draft -> approved -> published` or `draft -> rejected`. Editing a variant puts it back into `draft`, requiring approval again. An attempt to schedule an unapproved variant returns HTTP 409.
