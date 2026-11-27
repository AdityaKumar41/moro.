import { it, expect } from "vitest";
import {
  resourcesForOwner,
  designResourcesSchema,
} from "../lib/design-resources";
it("retains variable data and attachment metadata in a versioned project document", () => {
  const resources = {
    version: 1,
    variableData: [{ name: "Ada", number: "101" }],
    uploadPath: "owner/source.pdf",
    uploadName: "Race print.pdf",
  };
  expect(
    resourcesForOwner(JSON.parse(JSON.stringify(resources)), "owner"),
  ).toEqual(resources);
});
it("rejects another customer’s source attachment, traversal and oversized rows", () => {
  expect(() =>
    resourcesForOwner({ uploadPath: "other/source.pdf" }, "owner"),
  ).toThrow();
  expect(() =>
    resourcesForOwner({ uploadPath: "owner/../other.pdf" }, "owner"),
  ).toThrow();
  expect(
    designResourcesSchema.safeParse({
      variableData: [{ name: "x".repeat(301) }],
    }).success,
  ).toBe(false);
});
it("opens legacy projects without requiring a data migration", () => {
  expect(resourcesForOwner(undefined, "owner")).toEqual({
    version: 1,
    variableData: [],
  });
});
