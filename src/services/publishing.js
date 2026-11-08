const crypto = require('node:crypto');
const db = require('../db');
const { getPublisher } = require('../adapters');

async function publishSchedule(scheduleId) {
  const schedule = db.prepare(`SELECT s.*, v.content, v.platform, v.id AS vid, v.status AS variant_status
    FROM schedules s JOIN variants v ON v.id=s.variant_id WHERE s.id=?`).get(scheduleId);
  if (!schedule) throw Object.assign(new Error('Schedule not found.'), { status: 404 });
  if (schedule.status === 'completed' || db.prepare("SELECT 1 FROM publish_attempts WHERE schedule_id=? AND status='success'").get(scheduleId)) {
    return { duplicate: true, scheduleId };
  }
  if (schedule.variant_status !== 'approved') throw Object.assign(new Error('Only approved variants can be published.'), { status: 409 });
  const claim = db.prepare("UPDATE schedules SET status='processing', processing_at=?, attempts=attempts+1 WHERE id=? AND status IN ('pending','failed') AND attempts < 5").run(new Date().toISOString(), scheduleId);
  if (!claim.changes) return { duplicate: true, scheduleId, inProgress: true };
  const attemptId = crypto.randomUUID();
  try {
    const result = await getPublisher(schedule.platform).publish(schedule.content, schedule.idempotency_key);
    const tx = db.transaction(() => {
      db.prepare(`INSERT INTO publish_attempts(id,schedule_id,variant_id,platform,status,external_id,response_json,attempted_at)
        VALUES(?,?,?,?, 'success',?,?,?)`).run(attemptId, scheduleId, schedule.vid, schedule.platform, result.externalId, JSON.stringify(result), new Date().toISOString());
      db.prepare("UPDATE schedules SET status='completed',last_error=NULL,processing_at=NULL WHERE id=?").run(scheduleId);
      db.prepare("UPDATE variants SET status='published',updated_at=? WHERE id=?").run(new Date().toISOString(), schedule.vid);
    });
    tx();
    return { duplicate: false, scheduleId, result };
  } catch (error) {
    db.prepare(`INSERT INTO publish_attempts(id,schedule_id,variant_id,platform,status,error,attempted_at)
      VALUES(?,?,?,?, 'failed',?,?)`).run(attemptId, scheduleId, schedule.vid, schedule.platform, error.message, new Date().toISOString());
    db.prepare("UPDATE schedules SET status='failed',last_error=?,processing_at=NULL WHERE id=?").run(error.message, scheduleId);
    if (error.retryAfter) db.prepare("UPDATE schedules SET scheduled_at=? WHERE id=?")
      .run(new Date(Date.now() + error.retryAfter * 1000).toISOString(), scheduleId);
    throw error;
  }
}
module.exports = { publishSchedule };
