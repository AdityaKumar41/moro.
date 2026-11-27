import { expect, it, vi } from "vitest";
vi.mock("../lib/db", () => ({ adminDb: vi.fn(), sessionDb: vi.fn() }));
import { jsonBody } from "../lib/http";
it("stops oversized streamed bodies without trusting Content-Length", async () => {
  let cancelled = false;
  const stream = new ReadableStream({
    pull(controller) {
      controller.enqueue(new Uint8Array(16));
    },
    cancel() {
      cancelled = true;
    },
  });
  const req = new Request("https://example.com", {
    method: "POST",
    body: stream,
    duplex: "half",
  } as RequestInit);
  await expect(jsonBody(req, 20)).rejects.toMatchObject({ status: 413 });
  expect(cancelled).toBe(true);
});
it("parses multibyte JSON split between chunks within the byte limit", async () => {
  const bytes = new TextEncoder().encode('{"name":"印刷"}');
  const req = new Request("https://example.com", {
    method: "POST",
    body: new ReadableStream({
      start(c) {
        c.enqueue(bytes.slice(0, 11));
        c.enqueue(bytes.slice(11));
        c.close();
      },
    }),
    duplex: "half",
  } as RequestInit);
  await expect(jsonBody(req, bytes.length)).resolves.toEqual({ name: "印刷" });
});
