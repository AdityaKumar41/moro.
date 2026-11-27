import { it, expect } from "vitest";
import { readyArtifacts } from "../lib/production-files";
const artifacts = [
  { id: "old-pdf", proof_id: "v1" },
  { id: "new-pdf", proof_id: "v2" },
  { id: "new-png", proof_id: "v2" },
];
it("lists only files from the current approved, fully rendered proof", () => {
  expect(
    readyArtifacts(artifacts, "v2", "paid", "done").map((a) => a.id),
  ).toEqual(["new-pdf", "new-png"]);
});
it("does not advertise downloads for partial jobs, missing approval or refunded orders", () => {
  expect(readyArtifacts(artifacts, "v2", "paid", "running")).toEqual([]);
  expect(readyArtifacts(artifacts, "v2", "refunded", "done")).toEqual([]);
  expect(readyArtifacts(artifacts, null, "paid", "done")).toEqual([]);
});
