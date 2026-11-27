import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    // PGlite and native print renders are CPU/memory intensive. Bound parallelism
    // on hosted runners instead of letting every render compete for two cores.
    maxWorkers: 2,
  },
});
