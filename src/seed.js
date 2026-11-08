require('dotenv').config();
const crypto = require('node:crypto');
const db = require('./db');
const { generateVariants } = require('./services/generator');
const id = crypto.randomUUID();
db.prepare('INSERT INTO posts(id,title,body,source_url,created_at) VALUES(?,?,?,?,?)').run(id,'Why reliable publishing matters','A strong social publishing workflow turns one useful article into clear platform-specific messages. Approval, scheduling, and safe retries help teams publish consistently.','https://example.com/reliable-publishing',new Date().toISOString());
console.log(`Seed post created: ${id}`);
console.log(`Generated variants: ${generateVariants(id).length}`);
