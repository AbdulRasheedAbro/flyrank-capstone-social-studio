const crypto = require('node:crypto');
const SocialPublisher = require('./SocialPublisher');
class MockPublisher extends SocialPublisher {
  constructor(platform) { super(); this.platform = platform; }
  async publish(content, idempotencyKey) {
    return { externalId: `mock_${crypto.createHash('sha256').update(idempotencyKey).digest('hex').slice(0, 12)}`,
      platform: this.platform, preview: content, simulated: true };
  }
}
module.exports = MockPublisher;
