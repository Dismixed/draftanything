import { describe, expect, it } from "vitest";

import {
  createRoomSchema,
  displayNameSchema,
  joinRoomSchema,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
} from "./schema";
import { generateRoomCode } from "./service";

// ---------------------------------------------------------------------------
// displayNameSchema
// ---------------------------------------------------------------------------
describe("displayNameSchema", () => {
  it("accepts a single visible character", () => {
    expect(displayNameSchema.safeParse("A").success).toBe(true);
  });

  it("accepts a name at exactly 30 characters", () => {
    expect(displayNameSchema.safeParse("A".repeat(30)).success).toBe(true);
  });

  it("rejects an empty string", () => {
    expect(displayNameSchema.safeParse("").success).toBe(false);
  });

  it("rejects a name of 31 characters", () => {
    expect(displayNameSchema.safeParse("A".repeat(31)).success).toBe(false);
  });

  it("rejects a whitespace-only string", () => {
    expect(displayNameSchema.safeParse("   ").success).toBe(false);
  });

  it("accepts a name with mixed characters", () => {
    expect(displayNameSchema.safeParse("Jane Doe 42").success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// createRoomSchema
// ---------------------------------------------------------------------------

const validCreateInput = {
  displayName: "Alice",
  topic: "Best TV Shows",
  maxPlayers: 4,
  rounds: 5,
  timerSeconds: 60,
  draftType: "standard" as const,
  judgingMode: "ai" as const,
  aiPersonality: "analyst" as const,
};

describe("createRoomSchema — valid inputs", () => {
  it("accepts a valid complete payload", () => {
    expect(createRoomSchema.safeParse(validCreateInput).success).toBe(true);
  });

  it("accepts timerSeconds of null (timer off)", () => {
    expect(
      createRoomSchema.safeParse({ ...validCreateInput, timerSeconds: null }).success,
    ).toBe(true);
  });

  it("accepts timerSeconds of 15 (minimum)", () => {
    expect(
      createRoomSchema.safeParse({ ...validCreateInput, timerSeconds: 15 }).success,
    ).toBe(true);
  });

  it("accepts timerSeconds of 180 (maximum)", () => {
    expect(
      createRoomSchema.safeParse({ ...validCreateInput, timerSeconds: 180 }).success,
    ).toBe(true);
  });

  it("accepts maxPlayers of 2 (minimum)", () => {
    expect(
      createRoomSchema.safeParse({ ...validCreateInput, maxPlayers: 2 }).success,
    ).toBe(true);
  });

  it("accepts maxPlayers of 6 (maximum)", () => {
    expect(
      createRoomSchema.safeParse({ ...validCreateInput, maxPlayers: 6 }).success,
    ).toBe(true);
  });

  it("accepts rounds of 1 (minimum)", () => {
    expect(
      createRoomSchema.safeParse({ ...validCreateInput, rounds: 1 }).success,
    ).toBe(true);
  });

  it("accepts rounds of 10 (maximum)", () => {
    expect(
      createRoomSchema.safeParse({ ...validCreateInput, rounds: 10 }).success,
    ).toBe(true);
  });

  it("accepts topic of 2 characters (minimum)", () => {
    expect(
      createRoomSchema.safeParse({ ...validCreateInput, topic: "AB" }).success,
    ).toBe(true);
  });

  it("accepts topic of 80 characters (maximum)", () => {
    expect(
      createRoomSchema.safeParse({ ...validCreateInput, topic: "A".repeat(80) }).success,
    ).toBe(true);
  });

  it("accepts all draft types", () => {
    const types = ["standard", "snake", "random"] as const;
    for (const draftType of types) {
      expect(
        createRoomSchema.safeParse({ ...validCreateInput, draftType }).success,
      ).toBe(true);
    }
  });

  it("accepts all judging modes", () => {
    const modes = ["ai", "community", "hybrid"] as const;
    for (const judgingMode of modes) {
      expect(
        createRoomSchema.safeParse({ ...validCreateInput, judgingMode }).success,
      ).toBe(true);
    }
  });

  it("accepts all AI personalities", () => {
    const personalities = ["analyst", "hype", "roast", "custom"] as const;
    for (const aiPersonality of personalities) {
      expect(
        createRoomSchema.safeParse({
          ...validCreateInput,
          aiPersonality,
          customJudgePrompt: aiPersonality === "custom" ? "Judge like a food critic." : null,
        }).success,
      ).toBe(true);
    }
  });

  it("requires custom judge instructions when personality is custom", () => {
    expect(
      createRoomSchema.safeParse({
        ...validCreateInput,
        aiPersonality: "custom",
      }).success,
    ).toBe(false);
  });

  it("rejects custom judge instructions for preset personalities", () => {
    expect(
      createRoomSchema.safeParse({
        ...validCreateInput,
        aiPersonality: "analyst",
        customJudgePrompt: "Judge like a food critic.",
      }).success,
    ).toBe(false);
  });
});

describe("createRoomSchema — invalid inputs", () => {
  it("rejects maxPlayers of 1 (below minimum)", () => {
    expect(
      createRoomSchema.safeParse({ ...validCreateInput, maxPlayers: 1 }).success,
    ).toBe(false);
  });

  it("rejects maxPlayers of 7 (above maximum)", () => {
    expect(
      createRoomSchema.safeParse({ ...validCreateInput, maxPlayers: 7 }).success,
    ).toBe(false);
  });

  it("rejects rounds of 0", () => {
    expect(
      createRoomSchema.safeParse({ ...validCreateInput, rounds: 0 }).success,
    ).toBe(false);
  });

  it("rejects rounds of 11 (above maximum)", () => {
    expect(
      createRoomSchema.safeParse({ ...validCreateInput, rounds: 11 }).success,
    ).toBe(false);
  });

  it("rejects timerSeconds of 14 (below minimum when set)", () => {
    expect(
      createRoomSchema.safeParse({ ...validCreateInput, timerSeconds: 14 }).success,
    ).toBe(false);
  });

  it("rejects timerSeconds of 181 (above maximum)", () => {
    expect(
      createRoomSchema.safeParse({ ...validCreateInput, timerSeconds: 181 }).success,
    ).toBe(false);
  });

  it("rejects topic shorter than 2 characters", () => {
    expect(
      createRoomSchema.safeParse({ ...validCreateInput, topic: "A" }).success,
    ).toBe(false);
  });

  it("rejects topic longer than 80 characters", () => {
    expect(
      createRoomSchema.safeParse({ ...validCreateInput, topic: "A".repeat(81) }).success,
    ).toBe(false);
  });

  it("rejects unknown draft type", () => {
    expect(
      createRoomSchema.safeParse({ ...validCreateInput, draftType: "auction" }).success,
    ).toBe(false);
  });

  it("rejects unknown judging mode", () => {
    expect(
      createRoomSchema.safeParse({ ...validCreateInput, judgingMode: "crowd" }).success,
    ).toBe(false);
  });

  it("rejects unknown personality", () => {
    expect(
      createRoomSchema.safeParse({ ...validCreateInput, aiPersonality: "villain" }).success,
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// joinRoomSchema
// ---------------------------------------------------------------------------
describe("joinRoomSchema", () => {
  it("accepts a valid join payload", () => {
    expect(
      joinRoomSchema.safeParse({ displayName: "Bob", roomCode: "ABCDEF" }).success,
    ).toBe(true);
  });

  it("rejects a room code shorter than 6 characters", () => {
    expect(
      joinRoomSchema.safeParse({ displayName: "Bob", roomCode: "ABC" }).success,
    ).toBe(false);
  });

  it("rejects a room code longer than 6 characters", () => {
    expect(
      joinRoomSchema.safeParse({ displayName: "Bob", roomCode: "ABCDEFG" }).success,
    ).toBe(false);
  });

  it("rejects a room code containing ambiguous characters (0, O, I, l, 1)", () => {
    expect(
      joinRoomSchema.safeParse({ displayName: "Bob", roomCode: "ABC0EF" }).success,
    ).toBe(false);
  });

  it("rejects lowercase room code", () => {
    expect(
      joinRoomSchema.safeParse({ displayName: "Bob", roomCode: "abcdef" }).success,
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// generateRoomCode
// ---------------------------------------------------------------------------
describe("generateRoomCode", () => {
  it("returns a code of the correct length", () => {
    const code = generateRoomCode();
    expect(code).toHaveLength(ROOM_CODE_LENGTH);
  });

  it("uses only characters from the ambiguity-free alphabet", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateRoomCode();
      for (const char of code) {
        expect(ROOM_CODE_ALPHABET).toContain(char);
      }
    }
  });

  it("does not include ambiguous characters (0, O, I, l, 1)", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateRoomCode();
      expect(code).not.toMatch(/[0OIl1]/);
    }
  });

  it("produces uppercase codes", () => {
    for (let i = 0; i < 20; i++) {
      const code = generateRoomCode();
      expect(code).toBe(code.toUpperCase());
    }
  });

  it("produces varied codes (collision risk negligible)", () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateRoomCode()));
    // With 32^6 = ~1B possibilities, 100 codes should all be unique
    expect(codes.size).toBeGreaterThan(90);
  });
});
