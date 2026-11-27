export type OrderProgress = {
  status: string;
  payment_status: string;
  approved_proof_id: string | null;
  proofs: { version: number; state: string }[];
};
export function needsProofApproval(order: OrderProgress) {
  if (
    order.status !== "proof" ||
    order.payment_status !== "paid" ||
    order.approved_proof_id
  )
    return false;
  const latest = order.proofs.reduce<
    OrderProgress["proofs"][number] | undefined
  >(
    (latest, p) => (!latest || p.version > latest.version ? p : latest),
    undefined,
  );
  return latest?.state === "ready";
}
export const stageLabels: Record<string, string> = {
  quote: "Quote",
  order: "Order placed",
  artwork: "Preparing artwork",
  proof: "Proof review",
  production: "In production",
  completed: "Completed",
};
