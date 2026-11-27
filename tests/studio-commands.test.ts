import { it, expect } from "vitest";
import { applyLayerCommand, studioShortcut } from "../lib/studio-commands";
import { initialArtwork } from "../lib/initial-artwork";
import { defaultConfig, designSchema, validateArtwork } from "../lib/catalog";
import { studioIssues, persistDraft, parseDraft } from "../lib/studio-draft";
import { renderArtwork } from "../lib/render";
import sharp from "sharp";
const config = defaultConfig();
it("deletes through the final layer, keeps an undo snapshot intact and permits draft persistence", () => {
  const original = initialArtwork();
  let next = { artwork: original, selected: original.layers[0].id };
  for (const layer of original.layers)
    next = applyLayerCommand(next.artwork, layer.id, "delete", config)!;
  expect(next.artwork.layers).toEqual([]);
  expect(next.selected).toBe("");
  expect(original.layers.length).toBeGreaterThan(0);
  expect(designSchema.safeParse(next.artwork).success).toBe(true);
  let raw = "";
  persistDraft(
    {
      setItem: (_k, v) => {
        raw = v;
      },
    },
    {
      version: 1,
      ownerId: null,
      designId: crypto.randomUUID(),
      updatedAt: Date.now(),
      artwork: next.artwork,
      configuration: config,
      variableData: [],
    },
  );
  expect(parseDraft(raw, null)?.artwork.layers).toEqual([]);
  expect(() => validateArtwork(next.artwork, config)).toThrow("visible");
  expect(studioIssues(next.artwork, config)[0]).toContain("visible");
});
it("locks prevent deletion, duplication and reordering but allow unlocking and visibility changes", () => {
  const art = initialArtwork(),
    id = art.layers[0].id;
  const locked = applyLayerCommand(art, id, "lock", config)!.artwork;
  for (const command of ["delete", "duplicate", "forward"] as const)
    expect(applyLayerCommand(locked, id, command, config)).toBeNull();
  expect(
    applyLayerCommand(locked, id, "visibility", config)!.artwork.layers[0]
      .hidden,
  ).toBe(true);
  expect(
    applyLayerCommand(locked, id, "lock", config)!.artwork.layers[0].locked,
  ).toBe(false);
});
it("duplicates and moves one stacking position without changing existing layer identities", () => {
  const art = initialArtwork(),
    id = art.layers[0].id,
    newId = crypto.randomUUID();
  const copy = applyLayerCommand(art, id, "duplicate", config, newId)!;
  expect(copy.selected).toBe(newId);
  expect(copy.artwork.layers[1].id).toBe(newId);
  expect(copy.artwork.layers[1].text).toBe(art.layers[0].text);
  const moved = applyLayerCommand(copy.artwork, newId, "front", config)!;
  expect(moved.artwork.layers.at(-1)?.id).toBe(newId);
  expect(
    applyLayerCommand(moved.artwork, newId, "backward", config)!.artwork
      .layers[1].id,
  ).toBe(newId);
});
it("shortcuts never delete a layer while editing text, using dialogs or typing a modifier chord", () => {
  const opts = { typing: false, modal: false, command: false, alt: false };
  expect(studioShortcut("Delete", opts)).toBe("delete");
  expect(studioShortcut("Backspace", opts)).toBe("delete");
  expect(studioShortcut("d", { ...opts, command: true })).toBe("duplicate");
  for (const override of [
    { typing: true },
    { modal: true },
    { alt: true },
    { command: true },
  ])
    expect(studioShortcut("Delete", { ...opts, ...override })).toBeNull();
});
it("hidden text neither renders nor requires CSV columns, while locked visible content still prints", async () => {
  const art = initialArtwork();
  art.layers = art.layers.map((l, i) => ({
    ...l,
    hidden: i === 0,
    locked: i !== 0,
    text: i === 0 ? "{{missing}}" : "VISIBLE",
  }));
  const output = await renderArtwork(art, config, {}, 150);
  const without = await renderArtwork(
    { ...art, layers: art.layers.filter((l) => !l.hidden) },
    config,
    {},
    150,
  );
  expect(await sharp(output.png).raw().toBuffer()).toEqual(
    await sharp(without.png).raw().toBuffer(),
  );
  expect(() =>
    validateArtwork(
      { ...art, layers: art.layers.map((l) => ({ ...l, hidden: true })) },
      config,
    ),
  ).toThrow("visible");
}, 15000);
it("drag ordering moves only the intended layer and respects locks", async () => {
  const { moveLayerTo } = await import("../lib/studio-commands");
  const art = initialArtwork(),
    id = art.layers[0].id,
    target = art.layers[1].id;
  expect(moveLayerTo(art, id, target)?.layers.at(-1)?.id).toBe(id);
  expect(art.layers[0].id).toBe(id);
  expect(
    moveLayerTo(
      { ...art, layers: art.layers.map((l) => ({ ...l, locked: true })) },
      id,
      target,
    ),
  ).toBeNull();
});
it("the order boundary rejects empty/fully hidden artwork and ignores hidden CSV placeholders", async () => {
  const { orderSchema } = await import("../lib/orders");
  const art = initialArtwork();
  const order = {
    requestKey: crypto.randomUUID(),
    configuration: config,
    artwork: art,
    variableData: [],
    shipping: {
      name: "Test Customer",
      email: "fixture@example.test",
      phone: "9999999999",
      line1: "Fixture address",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411001",
      gstin: "",
    },
  };
  expect(
    orderSchema.safeParse({ ...order, artwork: { ...art, layers: [] } })
      .success,
  ).toBe(false);
  expect(
    orderSchema.safeParse({
      ...order,
      artwork: {
        ...art,
        layers: art.layers.map((l) => ({ ...l, hidden: true })),
      },
    }).success,
  ).toBe(false);
  expect(
    orderSchema.safeParse({
      ...order,
      artwork: {
        ...art,
        layers: art.layers.map((l, i) =>
          i === 0 ? { ...l, hidden: true, text: "{{unused}}" } : l,
        ),
      },
    }).success,
  ).toBe(true);
});
