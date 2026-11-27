import { expect, it, vi, afterEach } from "vitest";
vi.mock("@/lib/worker", () => ({
  workOnce: vi.fn(async () => true),
  drainQueue: vi.fn(async () => 2),
}));
vi.mock("@/lib/http", async () => ({
  ...(await vi.importActual<typeof import("../lib/http")>("../lib/http")),
  actor: vi.fn(),
  limit: vi.fn(),
}));
vi.mock("../lib/db", () => ({ adminDb: vi.fn(), sessionDb: vi.fn() }));
import { GET } from "../app/api/worker/route";
import { workOnce, drainQueue } from "@/lib/worker";
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});
it("keeps targeted invocations to one resumable batch without unrelated work", async () => {
  vi.stubEnv("WORKER_TOKEN", "test-worker-token");
  const id = "11111111-1111-4111-8111-111111111111";
  const result = await GET(
    new Request("https://example.com/api/worker?order=" + id, {
      headers: { authorization: "Bearer test-worker-token" },
    }),
  );
  expect(await result.json()).toEqual({ batches: 1, orderId: id });
  expect(workOnce).toHaveBeenCalledExactlyOnceWith(5, id);
  expect(drainQueue).not.toHaveBeenCalled();
});
it("rejects empty targeted invocations instead of sweeping the global queue", async () => {
  vi.stubEnv("WORKER_TOKEN", "test-worker-token");
  const result = await GET(
    new Request("https://example.com/api/worker?order=", {
      headers: { authorization: "Bearer test-worker-token" },
    }),
  );
  expect(result.status).toBe(400);
  expect(drainQueue).not.toHaveBeenCalled();
  expect(workOnce).not.toHaveBeenCalled();
});
