/** @format */

// Prevents any static caching
module.exports = class CacheHandler {
  constructor() {}
  async get() {
    return null;
  }
  async set() {}
  async revalidateTag() {}
};
