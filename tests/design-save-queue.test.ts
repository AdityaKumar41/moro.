import { it, expect } from "vitest";
import { createDesignSaver } from "../lib/design-save-queue";
it("serializes slow autosave before a newer manual/checkout save", async () => {
  let release!: () => void;
  const writes: string[] = [];
  const save = createDesignSaver(async (name: string) => {
    if (name === "older") await new Promise<void>((r) => (release = r));
    writes.push(name);
    return name;
  });
  const first = save("older");
  const second = save("latest");
  await Promise.resolve();
  expect(writes).toEqual([]);
  release();
  expect(await first).toBe("older");
  expect(await second).toBe("latest");
  expect(writes).toEqual(["older", "latest"]);
});
it("allows a manual retry after a failed autosave", async () => {
  const save = createDesignSaver(async (name: string) => {
    if (name === "fail") throw Error("offline");
    return name;
  });
  await expect(save("fail")).rejects.toThrow("offline");
  expect(await save("latest")).toBe("latest");
});
