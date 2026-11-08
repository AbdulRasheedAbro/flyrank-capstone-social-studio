const SocialPublisher = require('./SocialPublisher');
class TelegramPublisher extends SocialPublisher {
  async publish(content) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId || token.startsWith('replace_')) {
      throw new Error('Telegram is not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env.');
    }
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: content })
    });
    const data = await response.json();
    if (response.status === 429) {
      const retryAfter = data.parameters?.retry_after || Number(response.headers.get('retry-after')) || 30;
      const error = new Error(`Telegram rate limit. Retry after ${retryAfter} seconds.`);
      error.retryAfter = retryAfter; throw error;
    }
    if (!response.ok || !data.ok) throw new Error(data.description || `Telegram API returned ${response.status}.`);
    return { externalId: String(data.result.message_id), platform: 'telegram', url: null, simulated: false };
  }
}
module.exports = TelegramPublisher;
