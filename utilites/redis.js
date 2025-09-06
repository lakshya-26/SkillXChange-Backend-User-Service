const { createClient } = require('redis');

const client = createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
});

const connect = () => {
  console.log(
    `( redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT} )`
  );
  return client.connect();
};

const get = (key) => {
  return client.get(key);
};

const set = (key, value, timeout = process.env.CACHE_TTL) => {
  return client.set(key, value, { EX: timeout });
};

const reset = () => {
  return client.reset();
};

const del = (key) => {
  return client.del(key);
};

const expire = (key, timeout = process.env.CACHE_TTL) => {
  return client.expire(key, timeout);
};

const flushDB = () => {
  return client.flushAll('ASYNC');
};

const disconnect = () => {
  return client.quit();
};

const deleteKeysByPattern = async (pattern) => {
  let cursor = '0';
  do {
    const scanResult = await client.scan(cursor, {
      MATCH: pattern,
      COUNT: 100,
    });

    cursor = scanResult.cursor;
    if (scanResult.keys.length) {
      await del(...scanResult.keys);
    }
  } while (cursor != '0');
};

const ping = () => {
  return client.ping();
};

module.exports = {
  connect,
  get,
  set,
  reset,
  del,
  expire,
  flushDB,
  disconnect,
  deleteKeysByPattern,
  ping,
};
