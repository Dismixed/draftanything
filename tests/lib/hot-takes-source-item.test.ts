import { beforeEach, describe, expect, it, vi } from "vitest";
import { sourceItemImage } from "@/lib/hot-takes/source-item";
import { resolveItemImageCandidates } from "@/lib/hot-takes/image-sourcing";
import { generateItemIcon } from "@/lib/hot-takes/icon-generate";
import { updateItem } from "@/lib/hot-takes/seed-db";
import type { ImageCandidate, ItemRow } from "@/lib/hot-takes/types";

vi.mock("@/lib/hot-takes/image-sourcing", () => ({
  resolveItemImageCandidates: vi.fn(),
}));

vi.mock("@/lib/hot-takes/icon-generate", () => ({
  generateItemIcon: vi.fn(),
}));

vi.mock("@/lib/hot-takes/seed-db", () => ({
  updateItem: vi.fn(),
}));

const resolveItemImageCandidatesMock = vi.mocked(resolveItemImageCandidates);
const generateItemIconMock = vi.mocked(generateItemIcon);
const updateItemMock = vi.mocked(updateItem);

function makeItem(overrides: Partial<ItemRow> = {}): ItemRow {
  return {
    id: "item-1",
    category_id: "category-1",
    slug: "pepperoni",
    label: "Pepperoni",
    sort_order: 1,
    wiki_title: "Pepperoni",
    image_url: null,
    image_candidates: [],
    selected_candidate_index: 0,
    image_source: null,
    status: "needs_image",
    subject_type: "real_entity",
    notes: null,
    photo_query: "pepperoni slice",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("sourceItemImage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("prefers a real photo when the lookup returns candidates", async () => {
    const candidate: ImageCandidate = {
      image_url: "https://example.com/pepperoni.jpg",
      thumb_url: "https://example.com/pepperoni-thumb.jpg",
    };
    resolveItemImageCandidatesMock.mockResolvedValue([candidate]);

    const item = makeItem();
    const db = {} as never;

    const result = await sourceItemImage(db, item, "Pizza Toppings", "pizza-toppings");

    expect(resolveItemImageCandidatesMock).toHaveBeenCalledWith({
      label: "Pepperoni",
      wikiTitle: "Pepperoni",
      categoryName: "Pizza Toppings",
      photoQuery: "pepperoni slice",
    });

    expect(updateItemMock).toHaveBeenCalledWith(db, "item-1", {
      image_candidates: [candidate],
      selected_candidate_index: 0,
      image_url: candidate.image_url,
      image_source: "wikimedia",
      status: "needs_review",
    });

    expect(generateItemIconMock).not.toHaveBeenCalled();

    expect(result).toEqual({ kind: "photo" });
  });

  it("generates an icon when the lookup misses", async () => {
    resolveItemImageCandidatesMock.mockResolvedValue([]);

    const existing: ImageCandidate = {
      image_url: "https://example.com/old.png",
      source: "manual",
    };
    const generated: ImageCandidate = {
      image_url: "https://example.com/generated/pepperoni.png",
      thumb_url: "https://example.com/generated/pepperoni.png",
      source: "generated",
      license: "AI-generated",
    };
    generateItemIconMock.mockResolvedValue({
      publicUrl: generated.image_url,
      candidate: generated,
    });

    const item = makeItem({ subject_type: "generic", image_candidates: [existing] });
    const db = {} as never;

    const result = await sourceItemImage(db, item, "Pizza Toppings", "pizza-toppings");

    expect(generateItemIconMock).toHaveBeenCalledWith({
      categorySlug: "pizza-toppings",
      itemSlug: "pepperoni",
      categoryName: "Pizza Toppings",
      label: "Pepperoni",
      subjectType: "generic",
    });

    expect(updateItemMock).toHaveBeenCalledWith(db, "item-1", {
      image_candidates: [generated, existing],
      selected_candidate_index: 0,
      image_url: generated.image_url,
      image_source: "generated",
      status: "needs_review",
    });

    expect(result).toEqual({ kind: "generated" });
  });
});
