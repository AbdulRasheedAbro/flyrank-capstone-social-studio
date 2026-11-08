const Database = require('better-sqlite3');
const fs = require('node:fs');
const path = require('node:path');

const dbPath = process.env.DATABASE_PATH || './data/social-studio.db';
if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL, source_url TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS variants (
  id TEXT PRIMARY KEY, post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, content TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft'
    CHECK(status IN ('draft','approved','rejected','published')),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(post_id, platform)
);
CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY, variant_id TEXT NOT NULL REFERENCES variants(id),
  scheduled_at TEXT NOT NULL, idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','completed','failed')),
  attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT, processing_at TEXT, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_schedules_due ON schedules(status, scheduled_at);
CREATE TABLE IF NOT EXISTS publish_attempts (
  id TEXT PRIMARY KEY, schedule_id TEXT NOT NULL REFERENCES schedules(id),
  variant_id TEXT NOT NULL REFERENCES variants(id), platform TEXT NOT NULL,
  status TEXT NOT NULL, external_id TEXT, response_json TEXT, error TEXT,
  attempted_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_success_per_schedule
  ON publish_attempts(schedule_id) WHERE status = 'success';
`);
module.exports = db;
