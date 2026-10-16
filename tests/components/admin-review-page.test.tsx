import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import AdminReviewPage from "@/app/admin/review/page";
import type { ReviewCell, ReviewGrid } from "@/lib/daily-review/types";

const cell = (date: string, title: string | null, extra: Partial<ReviewCell> = {}): ReviewCell => ({
  date,
  contentId: title,
  preview: title ? { title, adminHref: "/admin/hot-takes" } : null,
  reviewedBy: null,
  reviewedAt: null,
  locked: date === "2026-10-15",
  ...extra,
});

const grid: ReviewGrid = {
  today: "2026-10-15",
  dates: ["2026-10-15", "2026-10-16"],
  columns: [
    {
      game: "hot-takes",
      name: "Hot Takes",
      error: null,
      cells: [cell("2026-10-15", "Snacks"), cell("2026-10-16", "Cereals")],
    },
    { game: "chainlink", name: "Chain Link", error: "db down", cells: [] },
  ],
};

function json(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }));
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (url === "/api/admin/daily-review") return json({ grid, summary: { total: 1, byGame: [] } });
    if (url.startsWith("/api/admin/daily-review/alternates")) {
      return json({ alternates: [{ contentId: "c2", preview: { title: "Candy", adminHref: "/admin/hot-takes" } }] });
    }
    if (url === "/api/admin/daily-review/swap") return json({ error: "STALE" }, 409);
    if (url === "/api/admin/daily-review/approve") return json({ approved: 1, failed: [] });
    throw new Error(`unexpected fetch ${url} ${init?.method}`);
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AdminReviewPage", () => {
  it("shows the grid, the count, and a failing game's error", async () => {
    render(<AdminReviewPage />);
    expect(await screen.findByText("Cereals")).toBeInTheDocument();
    expect(screen.getByText("need review")).toBeInTheDocument();
    expect(screen.getByText(/Couldn.t load: db down/)).toBeInTheDocument();
    expect(screen.getByText("today · locked")).toBeInTheDocument();
  });

  it("does not open today's locked cell", async () => {
    render(<AdminReviewPage />);
    fireEvent.click(await screen.findByText("Snacks"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("swaps from what the admin saw, and reloads the grid when that changed", async () => {
    render(<AdminReviewPage />);
    fireEvent.click(await screen.findByText("Cereals"));
    expect(await screen.findByText("Candy")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Swap" }));
    expect(await screen.findByText(/changed since you opened it/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/daily-review/swap",
      expect.objectContaining({
        body: JSON.stringify({ game: "hot-takes", date: "2026-10-16", contentId: "c2", currentId: "Cereals", retire: false }),
      }),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/admin/daily-review")).toHaveLength(2);
  });

  it("lists every eligible item on request", async () => {
    render(<AdminReviewPage />);
    fireEvent.click(await screen.findByText("Cereals"));
    fireEvent.click(await screen.findByRole("button", { name: "Show all" }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/admin/daily-review/alternates?game=hot-takes&date=2026-10-16&all=1"),
    );
  });

  it("asks before swap + retire", async () => {
    render(<AdminReviewPage />);
    fireEvent.click(await screen.findByText("Cereals"));
    fireEvent.click(await screen.findByRole("button", { name: "Swap + retire" }));
    expect(screen.getByText(/Retire .Cereals.\? It won.t be picked again/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith("/api/admin/daily-review/swap", expect.anything());
  });

  it("approves a whole row", async () => {
    render(<AdminReviewPage />);
    await screen.findByText("Cereals");
    const rowButtons = screen.getAllByRole("button", { name: "Approve all" });
    fireEvent.click(rowButtons[0]!);
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/daily-review/approve",
        expect.objectContaining({
          body: JSON.stringify({ items: [{ game: "hot-takes", date: "2026-10-16", contentId: "Cereals" }] }),
        }),
      ),
    );
  });
});
