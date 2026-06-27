// Cache-aside helper for expensive read endpoints (analytics aggregations etc).
// Degrades gracefully to "always compute" if Redis is unavailable.
'use strict';

async function withCache(req, res, key, ttlSeconds, computeFn) {
  const redis = req.app.get('redis');
  if (redis) {
    try {
      const cached = await redis.get(key);
      if (cached) return res.json(JSON.parse(cached));
    } catch (_) { /* cache read failure is non-fatal */ }
  }

  const payload = await computeFn();

  if (redis) {
    try { await redis.set(key, JSON.stringify(payload), 'EX', ttlSeconds); } catch (_) { /* non-fatal */ }
  }

  res.json(payload);
}

module.exports = { withCache };
