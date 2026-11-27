import { it, expect } from "vitest";
import { businessDate } from "../lib/business-date";
it("uses the Indian business day for orders on either side of local midnight", () => {
  expect(businessDate("2026-11-26T18:29:59Z")).toBe("2026-11-26");
  expect(businessDate("2026-11-26T18:30:00Z")).toBe("2026-11-27");
});
it("retains zero-padded date keys across a year boundary", () => {
  expect(businessDate("2026-12-31T20:00:00Z")).toBe("2027-01-01");
});
