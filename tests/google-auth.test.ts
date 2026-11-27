import { beforeEach, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  destination: "/studio?product=labels&intent=save",
  set: vi.fn(),
  exchange: vi.fn(),
  oauth: vi.fn(),
  enabled: vi.fn(),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => ({ value: mocks.destination }),
    set: mocks.set,
  }),
}));
vi.mock("@/lib/db", () => ({
  sessionDb: async () => ({
    auth: {
      exchangeCodeForSession: mocks.exchange,
      signInWithOAuth: mocks.oauth,
    },
  }),
}));
vi.mock(
  "@/lib/auth-destination",
  async () => import("../lib/auth-destination"),
);
vi.mock("@/lib/auth-providers", () => ({ googleSignInEnabled: mocks.enabled }));
import { GET as callback } from "../app/auth/callback/route";
import { GET as google } from "../app/auth/google/route";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.destination = "/studio?product=labels&intent=save";
});
it("does not exchange a code after cancellation and restores the safe studio destination", async () => {
  const response = await callback(
    new Request(
      "https://store.test/auth/callback?error=access_denied&error_description=untrusted",
    ),
  );
  const url = new URL(response.headers.get("location")!);
  expect(url.searchParams.get("error")).toBe("cancelled");
  expect(url.searchParams.get("next")).toBe(mocks.destination);
  expect(mocks.exchange).not.toHaveBeenCalled();
  expect(mocks.set).toHaveBeenCalledWith(
    "moro-auth-return",
    "",
    expect.objectContaining({ maxAge: 0 }),
  );
});
it("uses a successful PKCE exchange before returning to a saved design", async () => {
  mocks.exchange.mockResolvedValue({ error: null });
  const response = await callback(
    new Request(
      "https://store.test/auth/callback?code=single-use-code&next=https://evil.test",
    ),
  );
  expect(mocks.exchange).toHaveBeenCalledWith("single-use-code");
  expect(response.headers.get("location")).toBe(
    "https://store.test" + mocks.destination,
  );
});
it("recovers from a network failure and rejects an external return cookie", async () => {
  mocks.destination = "https://evil.test";
  mocks.exchange.mockRejectedValue(new Error("network"));
  const response = await callback(
    new Request("https://store.test/auth/callback?code=bad"),
  );
  expect(
    new URL(response.headers.get("location")!).searchParams.get("next"),
  ).toBe("/account");
});
it("starts redirect OAuth with an exact callback and a protected, allowlisted return cookie", async () => {
  vi.stubEnv("APP_URL", "https://store.test");
  mocks.enabled.mockResolvedValue(true);
  mocks.oauth.mockResolvedValue({
    data: {
      url: "https://project.supabase.co/auth/v1/authorize?provider=google",
    },
    error: null,
  });
  try {
    const response = await google(
      new Request("https://store.test/auth/google?next=https://evil.test"),
    );
    expect(mocks.oauth).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "google",
        options: expect.objectContaining({
          redirectTo: "https://store.test/auth/callback",
        }),
      }),
    );
    expect(mocks.set).toHaveBeenCalledWith(
      "moro-auth-return",
      "/account",
      expect.objectContaining({ httpOnly: true, sameSite: "lax", maxAge: 600 }),
    );
    expect(new URL(response.headers.get("location")!).hostname).toBe(
      "project.supabase.co",
    );
  } finally {
    vi.unstubAllEnvs();
  }
});

it("keeps recovery on the configured public origin when the runtime exposes its internal hostname", async () => {
  vi.stubEnv("APP_URL", "https://store.test");
  mocks.exchange.mockResolvedValue({ error: null });
  try {
    const response = await callback(
      new Request(
        "http://0.0.0.0:3000/auth/callback?code=recovery-code&next=/auth/reset",
      ),
    );
    expect(response.headers.get("location")).toBe(
      "https://store.test/auth/reset",
    );
  } finally {
    vi.unstubAllEnvs();
  }
});
it("keeps expired-link and cancellation recovery on the configured origin too", async () => {
  vi.stubEnv("APP_URL", "https://store.test");
  mocks.exchange.mockResolvedValue({ error: { message: "expired" } });
  try {
    for (const query of ["code=expired", "error=access_denied"]) {
      const response = await callback(
        new Request("http://0.0.0.0:3000/auth/callback?" + query),
      );
      expect(new URL(response.headers.get("location")!).origin).toBe(
        "https://store.test",
      );
    }
  } finally {
    vi.unstubAllEnvs();
  }
});

it("requires provider validation even when the callback code is missing", async () => {
  mocks.exchange.mockResolvedValue({ error: { message: "missing code" } });
  const response = await callback(
    new Request("https://store.test/auth/callback"),
  );
  expect(mocks.exchange).toHaveBeenCalledWith("");
  expect(new URL(response.headers.get("location")!).pathname).toBe("/auth");
  expect(
    new URL(response.headers.get("location")!).searchParams.get("error"),
  ).toBe("expired");
});
