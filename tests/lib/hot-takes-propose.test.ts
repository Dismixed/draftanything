import { describe, expect, it } from "vitest";
import { CategoryProposalSchema, ProposalSchema } from "@/lib/hot-takes/propose";

describe("ProposalSchema", () => {
  it("accepts a valid real_entity item", () => {
    const result = ProposalSchema.safeParse({
      items: [
        {
          slug: "pepperoni",
          label: "Pepperoni",
          wiki_title: "Pepperoni",
          notes: "A classic topping.",
          subject_type: "real_entity",
          photo_query: "pepperoni",
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("accepts a valid generic item with a null wiki_title", () => {
    const result = ProposalSchema.safeParse({
      items: [
        {
          slug: "meeting-type",
          label: "Meeting type",
          wiki_title: null,
          notes: null,
          subject_type: "generic",
          photo_query: "meeting type",
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects an item with an unknown subject_type", () => {
    const result = ProposalSchema.safeParse({
      items: [
        {
          slug: "person",
          label: "Person",
          wiki_title: "Person",
          subject_type: "person",
          photo_query: "person",
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rejects an item missing photo_query", () => {
    const result = ProposalSchema.safeParse({
      items: [
        {
          slug: "pepperoni",
          label: "Pepperoni",
          wiki_title: "Pepperoni",
          subject_type: "real_entity",
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rejects an item with an empty photo_query", () => {
    const result = ProposalSchema.safeParse({
      items: [
        {
          slug: "pepperoni",
          label: "Pepperoni",
          wiki_title: "Pepperoni",
          subject_type: "real_entity",
          photo_query: "",
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("accepts a generic item with an empty wiki_title", () => {
    const result = ProposalSchema.safeParse({
      items: [
        {
          slug: "meeting-type",
          label: "Meeting type",
          wiki_title: "",
          notes: null,
          subject_type: "generic",
          photo_query: "meeting type",
        },
      ],
    });

    expect(result.success).toBe(true);
  });
});

describe("CategoryProposalSchema", () => {
  it("accepts a valid category proposal with a name and items", () => {
    const result = CategoryProposalSchema.safeParse({
      name: "80s Cartoons",
      items: [
        {
          slug: "he-man",
          label: "He-Man",
          wiki_title: "He-Man",
          subject_type: "real_entity",
          photo_query: "He-Man",
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects a proposal missing a name", () => {
    const result = CategoryProposalSchema.safeParse({
      items: [
        {
          slug: "x",
          label: "X",
          subject_type: "generic",
          photo_query: "x",
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});
