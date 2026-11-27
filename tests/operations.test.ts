import { it, expect } from "vitest";
import { queueAge } from "../lib/operations";
it("shows honest queue age, including empty, future and invalid dates", () => {
  const now = Date.parse("2026-11-27T10:00:00Z");
  expect(queueAge(null, now)).toBe("No queued work");
  expect(queueAge("invalid", now)).toBe("Age unavailable");
  expect(queueAge("2026-11-27T10:01:00Z", now)).toBe("Less than a minute");
  expect(queueAge("2026-11-27T09:05:00Z", now)).toBe("55 min");
  expect(queueAge("2026-11-26T08:00:00Z", now)).toBe("1 day 2 hr");
});
