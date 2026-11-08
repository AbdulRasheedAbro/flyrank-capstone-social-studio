const db = require('../db');
const { publishSchedule } = require('./publishing');
let timer;
async function runDueJobs() {
  // Reclaim only stale locks. Never reset a job that another async publish is handling.
  // Telegram lacks remote idempotency support; review ambiguous Telegram failures manually.
  db.prepare("UPDATE schedules SET status='failed',last_error='Stale worker lock; inspect history before retrying.',processing_at=NULL WHERE status='processing' AND processing_at < ?")
    .run(new Date(Date.now() - 120000).toISOString());
  const due = db.prepare("SELECT id FROM schedules WHERE status IN ('pending','failed') AND attempts < 5 AND scheduled_at <= ? ORDER BY scheduled_at LIMIT 20")
    .all(new Date().toISOString());
  for (const job of due) {
    try { await publishSchedule(job.id); }
    catch (error) { /* failure is persisted by publishSchedule */ }
  }
}
function startScheduler() {
  if (timer) return;
  const interval = Math.max(1000, Number(process.env.SCHEDULER_POLL_MS || 5000));
  runDueJobs();
  timer = setInterval(runDueJobs, interval);
}
function stopScheduler() { if (timer) clearInterval(timer); timer = null; }
module.exports = { runDueJobs, startScheduler, stopScheduler };
