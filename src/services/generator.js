const crypto = require('node:crypto');
const profiles = require('../profiles');
const { validateVariant } = require('./validation');
const db = require('../db');

function makeContent(post, platform) {
  const clean = post.body.replace(/\s+/g, ' ').trim();
  const tags = ['#Content', '#Ideas'];
  if (platform === 'mock_x') return `${post.title}: ${clean}`.slice(0, 280);
  if (platform === 'mock_linkedin') return `${post.title}\n\n${clean}\n\nWhat is your perspective? ${tags.join(' ')}`;
  return `${post.title}\n\n${clean}\n\n${tags.join(' ')}`;
}
function generateVariants(postId) {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId);
  if (!post) throw Object.assign(new Error('Post not found.'), { status: 404 });
  const insert = db.prepare(`INSERT INTO variants(id,post_id,platform,content,status,created_at,updated_at)
    VALUES(?,?,?,?, 'draft',?,?) ON CONFLICT(post_id,platform) DO NOTHING`);
  const now = new Date().toISOString();
  const results = [];
  const tx = db.transaction(() => {
    for (const platform of Object.keys(profiles)) {
      const content = makeContent(post, platform);
      const validation = validateVariant(platform, content);
      if (!validation.valid) throw Object.assign(new Error(validation.errors.join(' ')), { status: 422 });
      insert.run(crypto.randomUUID(), postId, platform, content, now, now);
      results.push(db.prepare('SELECT * FROM variants WHERE post_id=? AND platform=?').get(postId, platform));
    }
  });
  tx();
  return results;
}
module.exports = { generateVariants, makeContent };
