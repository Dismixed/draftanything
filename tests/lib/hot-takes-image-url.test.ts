import { describe, expect, it } from "vitest";
import { optimizedImageUrl } from "@/lib/hot-takes/image-url";

describe("optimizedImageUrl", () => {
  it("rewrites an existing Wikimedia thumbnail to a standard width", () => {
    const src =
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Pizza.jpg/3840px-Pizza.jpg?utm_source=en.wikipedia.org&utm_campaign=api";
    expect(optimizedImageUrl(src, 52)).toBe(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Pizza.jpg/120px-Pizza.jpg",
    );
  });

  it("rewrites an original Wikimedia file URL into a thumbnail", () => {
    const src =
      "https://upload.wikimedia.org/wikipedia/commons/5/51/Sous_vide_mashed_potatoes.jpg";
    expect(optimizedImageUrl(src, 52)).toBe(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Sous_vide_mashed_potatoes.jpg/120px-Sous_vide_mashed_potatoes.jpg",
    );
  });

  it("renders SVG sources as PNG thumbnails", () => {
    const src = "https://upload.wikimedia.org/wikipedia/commons/a/ab/Foo.svg";
    expect(optimizedImageUrl(src, 52)).toBe(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Foo.svg/120px-Foo.svg.png",
    );
  });

  it("snaps to the nearest allowed Wikimedia thumbnail step", () => {
    const src = "https://upload.wikimedia.org/wikipedia/commons/9/9b/Bar.jpg";
    expect(optimizedImageUrl(src, 28)).toContain("/60px-Bar.jpg"); // 2x = 56 -> 60
    expect(optimizedImageUrl(src, 10)).toContain("/20px-Bar.jpg"); // 2x = 20 -> 20
    expect(optimizedImageUrl(src, 44)).toContain("/120px-Bar.jpg"); // 2x = 88 -> 120
  });

  it("passes non-Wikimedia sources through unchanged", () => {
    const supabase =
      "https://phenavsrbkprwtaqobjl.supabase.co/storage/v1/object/public/hot-takes-icons/foo/bar.png";
    expect(optimizedImageUrl(supabase, 52)).toBe(supabase);

    const placeholder = "https://placehold.co/128x128/1e1e26/9a98a3?text=AB";
    expect(optimizedImageUrl(placeholder, 52)).toBe(placeholder);
  });

  it("returns null for empty sources", () => {
    expect(optimizedImageUrl(null, 52)).toBeNull();
    expect(optimizedImageUrl(undefined, 52)).toBeNull();
    expect(optimizedImageUrl("", 52)).toBeNull();
  });
});
