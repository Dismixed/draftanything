import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

const validEnv = {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
  OPENAI_API_KEY: "openai-key",
  OPENAI_MODEL: "gpt-5.5",
  GUEST_TOKEN_PEPPER: "a-secure-pepper-with-at-least-32-characters",
  APP_URL: "http://localhost:3000",
};

describe("parseEnv", () => {
  it("returns validated environment configuration", () => {
    expect(parseEnv(validEnv)).toEqual(validEnv);
  });

  it("defaults the OpenAI model when it is not configured", () => {
    expect(parseEnv({ ...validEnv, OPENAI_MODEL: undefined }).OPENAI_MODEL).toBe(
      "gpt-5.5",
    );
  });

  it("rejects missing server configuration", () => {
    expect(() => parseEnv({})).toThrow("Invalid environment");
  });

  it("rejects an invalid application URL", () => {
    expect(() => parseEnv({ ...validEnv, APP_URL: "not-a-url" })).toThrow(
      "Invalid environment",
    );
  });

  it("rejects a pepper shorter than 32 characters after trimming", () => {
    expect(() =>
      parseEnv({
        ...validEnv,
        GUEST_TOKEN_PEPPER: "              short              ",
      }),
    ).toThrow("Invalid environment");
  });

  it.each([
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "OPENAI_API_KEY",
    "OPENAI_MODEL",
  ] as const)("rejects whitespace-only %s", (field) => {
    expect(() => parseEnv({ ...validEnv, [field]: "   " })).toThrow(
      "Invalid environment",
    );
  });
});
