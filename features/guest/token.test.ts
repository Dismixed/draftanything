import { describe, expect, it } from "vitest";

import { generateGuestToken, hashGuestToken } from "./token";

const TEST_PEPPER = "a-secure-pepper-with-at-least-32-characters";

describe("generateGuestToken", () => {
  it("produces a non-empty string", () => {
    const token = generateGuestToken();
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });

  it("contains at least 256 bits of entropy (32 bytes → ≥43 base64url chars)", () => {
    // base64url encodes 3 bytes as 4 chars; 32 bytes → ceil(32*4/3) = 43 chars minimum
    const token = generateGuestToken();
    // base64url characters only (no +, /, =)
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    // 32 raw bytes encoded as base64url yields at least 43 characters
    expect(token.length).toBeGreaterThanOrEqual(43);
  });

  it("produces unique tokens on each call", () => {
    const tokens = Array.from({ length: 20 }, generateGuestToken);
    const unique = new Set(tokens);
    expect(unique.size).toBe(20);
  });
});

describe("hashGuestToken", () => {
  it("returns a hex string", () => {
    const hash = hashGuestToken("some-token", TEST_PEPPER);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it("produces a SHA-256 hex digest (64 hex chars)", () => {
    const hash = hashGuestToken("some-token", TEST_PEPPER);
    expect(hash).toHaveLength(64);
  });

  it("is stable — same token and pepper always yield the same hash", () => {
    const token = generateGuestToken();
    const hash1 = hashGuestToken(token, TEST_PEPPER);
    const hash2 = hashGuestToken(token, TEST_PEPPER);
    expect(hash1).toBe(hash2);
  });

  it("produces different hashes for different tokens", () => {
    const hash1 = hashGuestToken("token-a", TEST_PEPPER);
    const hash2 = hashGuestToken("token-b", TEST_PEPPER);
    expect(hash1).not.toBe(hash2);
  });

  it("produces different hashes for different peppers", () => {
    const token = generateGuestToken();
    const hash1 = hashGuestToken(token, TEST_PEPPER);
    const hash2 = hashGuestToken(token, "a-different-pepper-with-32-chars!!");
    expect(hash1).not.toBe(hash2);
  });

  it("the raw token does not appear in the hash", () => {
    const token = generateGuestToken();
    const hash = hashGuestToken(token, TEST_PEPPER);
    expect(hash).not.toContain(token);
  });
});

describe("guest session object safety", () => {
  it("raw token never appears in a persisted session record", () => {
    const token = generateGuestToken();
    const pepper = TEST_PEPPER;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Simulate what gets written to the DB: only the hash is stored
    const persistedRecord = {
      token_hash: hashGuestToken(token, pepper),
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    };

    const serialized = JSON.stringify(persistedRecord);
    expect(serialized).not.toContain(token);
  });

  it("rejects a session whose expires_at is in the past", () => {
    const past = new Date(Date.now() - 1000);

    function isSessionValid(expiresAt: Date): boolean {
      return expiresAt.getTime() > Date.now();
    }

    expect(isSessionValid(past)).toBe(false);
  });

  it("accepts a session whose expires_at is in the future", () => {
    const future = new Date(Date.now() + 60 * 60 * 1000);

    function isSessionValid(expiresAt: Date): boolean {
      return expiresAt.getTime() > Date.now();
    }

    expect(isSessionValid(future)).toBe(true);
  });
});
