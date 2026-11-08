const express = require('express');
const crypto = require('node:crypto');
const db = require('../db');
const { generateVariants } = require('../services/generator');
const { validateVariant } = require('../services/validation');
const { publishSchedule } = require('../services/publishing');
const router = express.Router();
const now = () => new Date().toISOString();

router.get('/health', (_req,res) => res.json({ status: 'ok', service: 'Social Media Studio' }));
router.post('/posts', async (req,res,next) => {
  try {
    const { title, body, url } = req.body || {};
    if (!title?.trim() || (!body?.trim() && !url)) return res.status(400).json({ error: 'title and either body (Markdown) or url are required.' });
    let storedBody = body?.trim() || '';
    if (!storedBody && url) {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) return res.status(400).json({error:'Only HTTP and HTTPS URLs are supported.'});
      const response = await fetch(parsed, { signal: AbortSignal.timeout(10000), headers: {'user-agent':'SocialMediaStudio/1.0'} });
      if (!response.ok) return res.status(422).json({error:`Source URL returned HTTP ${response.status}.`});
      const html = await response.text();
      storedBody = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi,' ')
        .replace(/<\/(p|div|h[1-6]|li|br)>/gi,'\n').replace(/<[^>]+>/g,' ')
        .replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'")
        .replace(/\s+/g,' ').trim().slice(0,50000);
      if (!storedBody) return res.status(422).json({error:'Could not extract readable text from the source URL.'});
    }
    const id = crypto.randomUUID();
    db.prepare('INSERT INTO posts(id,title,body,source_url,created_at) VALUES(?,?,?,?,?)').run(id,title.trim(),storedBody,url || null,now());
    res.status(201).json(db.prepare('SELECT * FROM posts WHERE id=?').get(id));
  } catch(e) { next(e); }
});
router.get('/posts', (_req,res) => res.json(db.prepare('SELECT * FROM posts ORDER BY created_at DESC').all()));
router.get('/posts/:id', (req,res,next) => {
  try { const post=db.prepare('SELECT * FROM posts WHERE id=?').get(req.params.id); if(!post) return res.status(404).json({error:'Post not found.'});
    res.json({ ...post, variants: db.prepare('SELECT * FROM variants WHERE post_id=?').all(post.id) }); } catch(e){next(e);}
});
router.post('/posts/:id/generate', (req,res,next) => { try { res.status(201).json(generateVariants(req.params.id)); } catch(e){next(e);} });
router.get('/variants', (_req,res) => res.json(db.prepare('SELECT v.*,p.title AS post_title FROM variants v JOIN posts p ON p.id=v.post_id ORDER BY v.created_at DESC').all()));
router.patch('/variants/:id', (req,res,next) => {
  try {
    const variant=db.prepare('SELECT * FROM variants WHERE id=?').get(req.params.id);
    if(!variant) return res.status(404).json({error:'Variant not found.'});
    if(variant.status==='published') return res.status(409).json({error:'Published variants cannot be edited.'});
    const { content, action }=req.body || {};
    if(action==='approve') {
      const check=validateVariant(variant.platform, content ?? variant.content);
      if(!check.valid) return res.status(422).json({error:'Variant violates its constraint profile.',details:check.errors});
      db.prepare("UPDATE variants SET content=?,status='approved',updated_at=? WHERE id=?").run(content ?? variant.content,now(),variant.id);
    } else if(action==='reject') db.prepare("UPDATE variants SET status='rejected',updated_at=? WHERE id=?").run(now(),variant.id);
    else if(action==='edit') {
      if(typeof content!=='string') return res.status(400).json({error:'content is required for edit.'});
      const check=validateVariant(variant.platform,content);
      if(!check.valid) return res.status(422).json({error:'Variant violates its constraint profile.',details:check.errors});
      db.prepare("UPDATE variants SET content=?,status='draft',updated_at=? WHERE id=?").run(content,now(),variant.id);
    } else return res.status(400).json({error:'action must be approve, edit, or reject.'});
    res.json(db.prepare('SELECT * FROM variants WHERE id=?').get(variant.id));
  } catch(e){next(e);}
});
router.post('/variants/:id/schedule', (req,res,next) => {
  try {
    const variant=db.prepare('SELECT * FROM variants WHERE id=?').get(req.params.id);
    if(!variant) return res.status(404).json({error:'Variant not found.'});
    if(variant.status!=='approved') return res.status(409).json({error:'Only approved variants can be scheduled.'});
    const date=new Date(req.body?.scheduledAt);
    if(!req.body?.scheduledAt || Number.isNaN(date.getTime())) return res.status(400).json({error:'scheduledAt must be a valid ISO date/time.'});
    const id=crypto.randomUUID(); const key=`${variant.id}:${date.toISOString()}`;
    db.prepare(`INSERT INTO schedules(id,variant_id,scheduled_at,idempotency_key,status,created_at)
      VALUES(?,?,?,?,'pending',?) ON CONFLICT(idempotency_key) DO NOTHING`).run(id,variant.id,date.toISOString(),key,now());
    const schedule=db.prepare('SELECT * FROM schedules WHERE idempotency_key=?').get(key);
    res.status(201).json(schedule);
  } catch(e){next(e);}
});
router.post('/schedules/:id/publish', async (req,res,next) => { try { res.json(await publishSchedule(req.params.id)); } catch(e){next(e);} });
router.get('/schedules', (_req,res) => res.json(db.prepare(`SELECT s.*,v.platform,v.content,v.status AS variant_status FROM schedules s JOIN variants v ON v.id=s.variant_id ORDER BY scheduled_at`).all()));
router.get('/history', (_req,res) => res.json(db.prepare('SELECT * FROM publish_attempts ORDER BY attempted_at DESC').all()));
module.exports = router;
