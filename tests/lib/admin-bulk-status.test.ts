import { describe, expect, it } from "vitest";
import { parseBulkStatus } from "@/lib/admin/bulk-status";

const allowed = ["approved", "rejected"] as const;
const id = "98613b54-3d45-40db-b404-8910ffab4b74";

describe("parseBulkStatus", () => {
  it("accepts a list of ids and an allowed status", () => {
    expect(parseBulkStatus({ ids: [id], status: "approved" }, allowed)).toEqual({ ids: [id], status: "approved" });
  });

  it("rejects a status that is not allowed", () => {
    expect(parseBulkStatus({ ids: [id], status: "published" }, allowed)).toBeNull();
  });

  it("rejects an empty list, a non-list, or anything that is not a uuid", () => {
    expect(parseBulkStatus({ ids: [], status: "approved" }, allowed)).toBeNull();
    expect(parseBulkStatus({ ids: id, status: "approved" }, allowed)).toBeNull();
    expect(parseBulkStatus({ ids: [id, "1; drop table"], status: "approved" }, allowed)).toBeNull();
  });

  it("rejects more ids than one request may change", () => {
    const many = Array.from({ length: 201 }, () => id);
    expect(parseBulkStatus({ ids: many, status: "approved" }, allowed)).toBeNull();
  });
});
