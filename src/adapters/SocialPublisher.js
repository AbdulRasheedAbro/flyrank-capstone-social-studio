class SocialPublisher {
  async publish(_content, _idempotencyKey) {
    throw new Error('publish() must be implemented by a concrete adapter.');
  }
}
module.exports = SocialPublisher;
