const MockPublisher = require('./MockPublisher');
const TelegramPublisher = require('./TelegramPublisher');
function getPublisher(platform) {
  if (platform === 'mock_x' || platform === 'mock_linkedin') return new MockPublisher(platform);
  if (platform === 'telegram') return new TelegramPublisher();
  throw Object.assign(new Error(`No publisher adapter configured for ${platform}.`), { status: 400 });
}
module.exports = { getPublisher };
