process.env.DATABASE_PATH = ':memory:';
const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/db');
const { validateVariant } = require('../src/services/validation');
const { generateVariants } = require('../src/services/generator');
const crypto = require('node:crypto');

test('constraint profiles reject an over-length X variant', () => {
  const result = validateVariant('mock_x', 'x'.repeat(281));
  assert.equal(result.valid, false);
  assert.match(result.errors.join(' '), /Maximum length is 280/);
});
test('constraint profiles reject too many hashtags', () => {
  const result = validateVariant('mock_x', '#one #two #three');
  assert.equal(result.valid, false);
  assert.match(result.errors.join(' '), /Maximum hashtag count is 2/);
});
test('generation creates three distinct platform variants from stored post', () => {
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO posts(id,title,body,created_at) VALUES(?,?,?,?)').run(id,'A useful title','A source article with enough information to create a concise social update.',new Date().toISOString());
  const variants = generateVariants(id);
  assert.equal(variants.length, 3);
  assert.deepEqual(new Set(variants.map(v=>v.platform)), new Set(['telegram','mock_x','mock_linkedin']));
  assert.ok(variants.every(v=>v.status==='draft'));
});
test('generation fails for an unknown post', () => {
  assert.throws(() => generateVariants('missing'), /Post not found/);
});
test('publishing the same scheduled mock variant twice creates one success record', async () => {
  const { publishSchedule } = require('../src/services/publishing');
  const postId = crypto.randomUUID();
  const variantId = crypto.randomUUID();
  const scheduleId = crypto.randomUUID();
  const timestamp = new Date(Date.now() - 1000).toISOString();
  db.prepare('INSERT INTO posts(id,title,body,created_at) VALUES(?,?,?,?)').run(postId,'Idempotency','A test post.',timestamp);
  db.prepare("INSERT INTO variants(id,post_id,platform,content,status,created_at,updated_at) VALUES(?,?,?,'Test message','approved',?,?)")
    .run(variantId,postId,'mock_x',timestamp,timestamp);
  db.prepare("INSERT INTO schedules(id,variant_id,scheduled_at,idempotency_key,status,created_at) VALUES(?,?,?,?,'pending',?)")
    .run(scheduleId,variantId,timestamp,`${variantId}:${timestamp}`,timestamp);
  const first = await publishSchedule(scheduleId);
  const second = await publishSchedule(scheduleId);
  assert.equal(first.duplicate, false);
  assert.equal(second.duplicate, true);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM publish_attempts WHERE schedule_id=? AND status='success'").get(scheduleId).n, 1);
});
