import { it, expect, vi } from "vitest";
import { sameOrigin } from "../lib/http";
it("accepts the visible host behind a development bind address", () => {
  expect(() =>
    sameOrigin(
      new Request("http://0.0.0.0:3000/api/quote", {
        headers: { Host: "localhost:3000", Origin: "http://localhost:3000" },
      }),
    ),
  ).not.toThrow();
});
it("rejects a cross-site origin and missing origin", () => {
  expect(() =>
    sameOrigin(
      new Request("https://store.test/api/orders", {
        headers: { Host: "store.test", Origin: "https://evil.test" },
      }),
    ),
  ).toThrow();
  expect(() =>
    sameOrigin(new Request("https://store.test/api/orders")),
  ).toThrow();
});
it("requires TLS for production writes", () => {
  vi.stubEnv("NODE_ENV", "production");
  try {
    expect(() =>
      sameOrigin(
        new Request("http://store.test/api/orders", {
          headers: { Host: "store.test", Origin: "http://store.test" },
        }),
      ),
    ).toThrow();
  } finally {
    vi.unstubAllEnvs();
  }
});
