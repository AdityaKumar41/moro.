import { it, expect } from "vitest";
import { needsProofApproval, type OrderProgress } from "../lib/project-status";
const order: OrderProgress = {
  status: "proof",
  payment_status: "paid",
  approved_proof_id: null,
  proofs: [{ version: 1, state: "ready" }],
};
it("only asks for approval when the latest paid proof is ready", () => {
  expect(needsProofApproval(order)).toBe(true);
  expect(
    needsProofApproval({
      ...order,
      proofs: [...order.proofs, { version: 2, state: "rendering" }],
    }),
  ).toBe(false);
  expect(
    needsProofApproval({
      ...order,
      proofs: [
        { version: 2, state: "ready" },
        { version: 1, state: "rendering" },
      ],
    }),
  ).toBe(true);
});
it("does not put unpaid, approved or completed work in the approval queue", () => {
  expect(needsProofApproval({ ...order, payment_status: "unpaid" })).toBe(
    false,
  );
  expect(needsProofApproval({ ...order, approved_proof_id: "proof-id" })).toBe(
    false,
  );
  expect(needsProofApproval({ ...order, status: "completed" })).toBe(false);
  expect(needsProofApproval({ ...order, proofs: [] })).toBe(false);
});
