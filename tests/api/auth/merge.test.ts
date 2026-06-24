import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/features/guest/token", () => ({
  hashGuestToken: vi.fn((token: string) => `hashed-${token}`),
}));

vi.mock("@/lib/request-id", () => ({
  generateRequestId: vi.fn(() => "test-req-id"),
  setRequestIdHeader: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logRoute: vi.fn(),
}));

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { POST } from "@/app/api/auth/merge/route";

describe("POST /api/auth/merge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns merged false with no_guest_session reason when no guest cookie", async () => {
    const mockCookieStore = { get: vi.fn().mockReturnValue(null) };
    vi.mocked(cookies).mockResolvedValue(mockCookieStore as never);

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ merged: false, reason: "no_guest_session" });
  });

  it("returns 401 when no authenticated user", async () => {
    const mockCookieStore = {
      get: vi.fn().mockReturnValue({ value: "some-guest-token" }),
    };
    vi.mocked(cookies).mockResolvedValue(mockCookieStore as never);

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    } as never);

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toHaveProperty("error", "UNAUTHORIZED");
  });
});
