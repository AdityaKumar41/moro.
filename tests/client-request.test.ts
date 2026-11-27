import { afterEach, it, expect, vi } from "vitest";
import { requestJson } from "../lib/client-request";
afterEach(() => vi.unstubAllGlobals());
it("returns checkout errors as readable messages and makes the request abortable", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "Checkout is temporarily unavailable. Try again.",
        }),
        { status: 503 },
      ),
    );
  vi.stubGlobal("fetch", fetch);
  await expect(
    requestJson("/api/checkout", { orderId: "fixture" }),
  ).rejects.toThrow("Checkout is temporarily unavailable");
  expect(fetch).toHaveBeenCalledWith(
    "/api/checkout",
    expect.objectContaining({
      method: "POST",
      signal: expect.any(AbortSignal),
    }),
  );
});
it("replaces network and proxy/HTML failures with recoverable feedback", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
  );
  await expect(requestJson("/api/designs")).rejects.toThrow(
    "Check your connection",
  );
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response("<html>proxy error</html>", { status: 502 }),
      ),
  );
  await expect(requestJson("/api/designs")).rejects.toThrow("Please try again");
});
it("explains request timeouts instead of exposing abort internals", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockRejectedValue(new DOMException("timeout", "TimeoutError")),
  );
  await expect(requestJson("/api/checkout", {})).rejects.toThrow(
    "taking longer than expected",
  );
});
