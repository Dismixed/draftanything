// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/room/service", () => ({ createRoom: vi.fn(), getRoom: vi.fn() }));
vi.mock("@/features/pool/service", () => ({ startPoolReview: vi.fn() }));
vi.mock("@/features/draft/service", () => ({ commenceOffTheDome: vi.fn() }));
vi.mock("./service", () => ({ addBot: vi.fn() }));

import { createRoom, getRoom } from "@/features/room/service";
import { startPoolReview } from "@/features/pool/service";
import { commenceOffTheDome } from "@/features/draft/service";
import { soloRoomSchema, type SoloRoomInput } from "@/features/room/schema";
import { addBot } from "./service";
import { createSoloRoom } from "./solo";

const input: SoloRoomInput = {
  displayName: "Josh",
  topic: "Best snacks",
  opponents: 3,
  rounds: 4,
  draftType: "snake",
  pickingMode: "pool",
  aiPersonality: "roast",
  customJudgePrompt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createRoom).mockResolvedValue({ draftId: "d1" } as never);
  vi.mocked(getRoom).mockResolvedValue({ draftId: "d1", phase: "POOL_REVIEW" } as never);
});

describe("createSoloRoom", () => {
  it("creates a room sized for the player and their opponents, AI judged, no timer", async () => {
    await createSoloRoom(input, "guest-1");

    expect(createRoom).toHaveBeenCalledWith(
      expect.objectContaining({
        maxPlayers: 4,
        judgingMode: "ai",
        timerSeconds: null,
        topic: "Best snacks",
        rounds: 4,
        draftType: "snake",
        aiPersonality: "roast",
      }),
      "guest-1",
    );
  });

  it("seats one AI drafter per opponent", async () => {
    await createSoloRoom({ ...input, opponents: 5 }, "guest-1");
    expect(addBot).toHaveBeenCalledTimes(5);
    expect(addBot).toHaveBeenCalledWith("d1", "guest-1");
  });

  it("sends a pool draft to pool review", async () => {
    const room = await createSoloRoom(input, "guest-1");
    expect(startPoolReview).toHaveBeenCalledWith("d1", "guest-1");
    expect(commenceOffTheDome).not.toHaveBeenCalled();
    expect(room).toMatchObject({ phase: "POOL_REVIEW" });
  });

  it("starts an off-the-dome draft straight away", async () => {
    await createSoloRoom({ ...input, pickingMode: "off_the_dome" }, "guest-1");
    expect(commenceOffTheDome).toHaveBeenCalledWith("d1", "guest-1");
    expect(startPoolReview).not.toHaveBeenCalled();
  });
});

describe("soloRoomSchema", () => {
  const parse = (over: Record<string, unknown>) =>
    soloRoomSchema.safeParse({ ...input, ...over }).success;

  it("accepts 1 to 5 opponents only", () => {
    expect(parse({ opponents: 1 })).toBe(true);
    expect(parse({ opponents: 5 })).toBe(true);
    expect(parse({ opponents: 0 })).toBe(false);
    expect(parse({ opponents: 6 })).toBe(false);
    expect(parse({ opponents: 2.5 })).toBe(false);
  });

  it("needs custom judge instructions exactly when the judge is custom", () => {
    expect(parse({ aiPersonality: "custom" })).toBe(false);
    expect(parse({ aiPersonality: "custom", customJudgePrompt: "Judge like a food critic." })).toBe(true);
    expect(parse({ customJudgePrompt: "Judge like a food critic." })).toBe(false);
  });

  it("rejects a blank name and a one-letter topic", () => {
    expect(parse({ displayName: "   " })).toBe(false);
    expect(parse({ topic: "x" })).toBe(false);
  });

  it("defaults to a pool draft", () => {
    const rest: Partial<SoloRoomInput> = { ...input };
    delete rest.pickingMode;
    const result = soloRoomSchema.safeParse(rest);
    expect(result.success && result.data.pickingMode).toBe("pool");
  });
});
