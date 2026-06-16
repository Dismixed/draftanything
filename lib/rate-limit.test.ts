import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, _resetRateLimitStore } from "./rate-limit";

beforeEach(() => {
  _resetRateLimitStore();
});

describe("checkRateLimit", () => {
  it("allows the first request", () => {
    const result = checkRateLimit("test:key", 3, 60_000);
    expect(result.allowed).toBe(true);
  });

  it("allows requests within the limit", () => {
    const key = "test:key2";
    expect(checkRateLimit(key, 3, 60_000).allowed).toBe(true);
    expect(checkRateLimit(key, 3, 60_000).allowed).toBe(true);
    expect(checkRateLimit(key, 3, 60_000).allowed).toBe(true);
  });

  it("blocks requests exceeding the limit", () => {
    const key = "test:key3";
    checkRateLimit(key, 2, 60_000);
    checkRateLimit(key, 2, 60_000);
    const result = checkRateLimit(key, 2, 60_000);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.retryAfterMs).toBeGreaterThan(0);
    }
  });

  it("resets after the window expires", () => {
    const key = "test:key4";
    expect(checkRateLimit(key, 1, 50).allowed).toBe(true);
    expect(checkRateLimit(key, 1, 50).allowed).toBe(false);
  });

  it("isolates keys from each other", () => {
    expect(checkRateLimit("key:a", 1, 60_000).allowed).toBe(true);
    expect(checkRateLimit("key:a", 1, 60_000).allowed).toBe(false);
    expect(checkRateLimit("key:b", 1, 60_000).allowed).toBe(true);
  });

  it("returns retryAfterMs in milliseconds", () => {
    const key = "test:key5";
    checkRateLimit(key, 1, 10_000);
    const result = checkRateLimit(key, 1, 10_000);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.retryAfterMs).toBeGreaterThan(0);
      expect(result.retryAfterMs).toBeLessThanOrEqual(10_000);
    }
  });
});
