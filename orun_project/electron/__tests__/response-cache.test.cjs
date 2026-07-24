const { ResponseCache } = require("../response-cache.cjs");

describe("ResponseCache", () => {
  let cache;

  beforeEach(() => {
    cache = new ResponseCache(60000, 5);
  });

  it("should set and get values", () => {
    cache.set("hello world", "hampton", "response1");
    expect(cache.get("hello world", "hampton")).toBe("response1");
  });

  it("should return null for missing keys", () => {
    expect(cache.get("missing", "hampton")).toBeNull();
  });

  it("should respect TTL", async () => {
    const shortCache = new ResponseCache(1, 5);
    shortCache.set("hello", "hampton", "value1");
    expect(shortCache.get("hello", "hampton")).toBe("value1");
    await new Promise((r) => setTimeout(r, 10));
    expect(shortCache.get("hello", "hampton")).toBeNull();
  });

  it("should evict oldest when full", () => {
    cache.set("msg1", "hampton", "r1");
    cache.set("msg2", "hampton", "r2");
    cache.set("msg3", "hampton", "r3");
    cache.set("msg4", "hampton", "r4");
    cache.set("msg5", "hampton", "r5");
    cache.set("msg6 long enough to hash differently", "hampton", "r6");
    expect(cache.get("msg1", "hampton")).toBeNull();
    expect(cache.get("msg6 long enough to hash differently", "hampton")).toBe("r6");
  });

  it("should clear all entries", () => {
    cache.set("msg1", "hampton", "r1");
    cache.set("msg2", "hampton", "r2");
    cache.clear();
    expect(cache.get("msg1", "hampton")).toBeNull();
    expect(cache.get("msg2", "hampton")).toBeNull();
  });

  it("should return stats", () => {
    cache.set("msg1", "hampton", "r1");
    cache.get("msg1", "hampton");
    cache.get("missing", "hampton");
    const stats = cache.stats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.entries).toBe(1);
  });
});
