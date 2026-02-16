const { Queue } = require('bullmq');

function getQueue() {
  const connection = { url: process.env.REDIS_URL || 'redis://redis:6379' };
  return new Queue('indexing', { connection });
}

module.exports = { getQueue };
