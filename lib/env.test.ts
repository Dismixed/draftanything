import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

describe("parseEnv", () => {
  it("rejects missing server configuration", () => {
    expect(() => parseEnv({})).toThrow("Invalid environment");
  });
});
