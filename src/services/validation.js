const profiles = require('../profiles');
function validateVariant(platform, content) {
  const profile = profiles[platform];
  if (!profile) return { valid: false, errors: [`Unknown platform: ${platform}`] };
  const errors = [];
  if (!content || !content.trim()) errors.push('Content must not be empty.');
  if (content.length > profile.maxLength) errors.push(`Maximum length is ${profile.maxLength} characters; received ${content.length}.`);
  const hashtags = content.match(/(^|\s)#[\p{L}\p{N}_]+/gu) || [];
  if (hashtags.length > profile.maxHashtags) errors.push(`Maximum hashtag count is ${profile.maxHashtags}; received ${hashtags.length}.`);
  return { valid: errors.length === 0, errors, profile };
}
module.exports = { validateVariant };
