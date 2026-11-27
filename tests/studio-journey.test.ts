import { it, expect } from "vitest";
import { authDestination } from "../lib/auth-destination";
import {
  parseDraft,
  persistDraft,
  studioIssues,
  DRAFT_TTL,
} from "../lib/studio-draft";
import { initialArtwork } from "../lib/initial-artwork";
import { defaultConfig } from "../lib/catalog";
const owner = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const draft = {
  version: 1 as const,
  updatedAt: Date.now(),
  ownerId: null,
  designId: owner,
  configuration: defaultConfig(),
  artwork: initialArtwork(),
  variableData: [],
};
it("only returns to approved internal destinations after authentication", () => {
  for (const value of [
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/%2f%2fevil.test",
    "/auth/callback?next=https://evil.test",
    "/studio\r\nLocation:evil",
  ])
    expect(authDestination(value)).toBe("/account");
  expect(
    authDestination(
      "/studio?product=race&intent=checkout&redirect=https://evil.test",
    ),
  ).toBe("/studio?product=race&intent=checkout");
  expect(authDestination("/admin")).toBe("/admin");
});
it("recovers a guest design through sign-in without persisting checkout details", () => {
  let raw = "";
  persistDraft(
    {
      setItem: (_key, value) => {
        raw = value;
      },
    },
    { ...draft, shipping: { name: "private" } } as typeof draft,
  );
  expect(raw).not.toContain("shipping");
  expect(parseDraft(raw, owner)?.artwork).toEqual(draft.artwork);
});
it("rejects expired, corrupted and cross-account drafts and private attachment paths", () => {
  expect(parseDraft("invalid", null)).toBeNull();
  expect(
    parseDraft(JSON.stringify(draft), null, draft.updatedAt + DRAFT_TTL + 1),
  ).toBeNull();
  expect(
    parseDraft(JSON.stringify({ ...draft, ownerId: owner }), other),
  ).toBeNull();
  expect(
    parseDraft(JSON.stringify({ ...draft, ownerId: owner }), null),
  ).toBeNull();
  expect(
    parseDraft(
      JSON.stringify({
        ...draft,
        ownerId: owner,
        uploadPath: other + "/source.pdf",
      }),
      owner,
    ),
  ).toBeNull();
  expect(
    parseDraft(
      JSON.stringify({
        ...draft,
        ownerId: owner,
        uploadPath: owner + "/source.pdf",
      }),
      owner,
    ),
  ).not.toBeNull();
});
it("does not hide storage failures", () => {
  expect(() =>
    persistDraft(
      {
        setItem: () => {
          throw Error("quota");
        },
      },
      draft,
    ),
  ).toThrow("quota");
});
it("blocks inconsistent personalisation and artwork rotated outside physical bounds", () => {
  const artwork = initialArtwork("race");
  const config = defaultConfig("race");
  expect(studioIssues(artwork, config, []).join()).toContain("number");
  expect(
    studioIssues(artwork, { ...config, quantity: 1 }, [{ number: "101" }]),
  ).toEqual([]);
  expect(
    studioIssues(artwork, { ...config, quantity: 2 }, [{ name: "Ada" }]),
  ).toHaveLength(2);
  const rotated = initialArtwork();
  rotated.layers[0] = {
    ...rotated.layers[0],
    width: 700,
    height: 700,
    rotation: 45,
    x: 500,
    y: 500,
  };
  expect(
    studioIssues(rotated, { ...defaultConfig(), width: 300, height: 10 }, []),
  ).not.toEqual([]);
});
