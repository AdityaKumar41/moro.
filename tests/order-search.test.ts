import { it, expect } from "vitest";
import { orderSearch, orderSearchUrl } from "../lib/order-search";
it("searches order numbers/customers and applies real database-stage/product filters", () => {
  const f = orderSearch(
    new URLSearchParams({
      search: "DH-123",
      status: "completed",
      family: "race",
      date: "2026-11-27",
    }),
  );
  expect(f.status).toBe("completed");
  expect(f.family).toBe("race");
  expect(f.or).toContain("number.eq.123");
  expect(f.from).toBe("2026-11-26T18:30:00.000Z");
  expect(f.until).toBe("2026-11-27T18:30:00.000Z");
  expect(
    orderSearch(
      new URLSearchParams({ search: "11111111-1111-4111-8111-111111111111" }),
    ).or,
  ).toContain("customer_id.eq.11111111-1111-4111-8111-111111111111");
});
it("cannot inject PostgREST OR operators or wildcard searches through user text", () => {
  const f = orderSearch(new URLSearchParams({ search: "x),id.neq.null,(x%" }));
  expect(f.or).not.toContain("),");
  expect(f.or).not.toContain("(");
  expect(f.or?.split(",")).toHaveLength(2);
  expect(
    orderSearch(new URLSearchParams({ search: "name_with_underscore" })).or,
  ).toContain("name\\_with\\_underscore");
  expect(() =>
    orderSearch(new URLSearchParams({ date: "2026-02-30" })),
  ).toThrow();
  expect(() =>
    orderSearch(new URLSearchParams({ status: "anything" })),
  ).toThrow();
});
it("preserves search filters while paginating instead of returning the unfiltered archive", () => {
  const u = new URL(
    orderSearchUrl(
      {
        search: "Ada",
        status: "completed",
        family: "labels",
        date: "2026-11-27",
      },
      200,
    ),
    "https://example.com",
  );
  expect(u.searchParams.get("search")).toBe("Ada");
  expect(u.searchParams.get("offset")).toBe("200");
  expect(u.searchParams.get("status")).toBe("completed");
});
it("preserves the literal search term all while removing only filter sentinels", () => {
  expect(
    orderSearchUrl({ search: "all", status: "all", family: "all", date: "" }),
  ).toBe("/api/orders?search=all");
});
