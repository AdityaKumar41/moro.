export function readyArtifacts<T extends { proof_id: string }>(
  artifacts: T[],
  approvedProofId: string | null,
  paymentStatus: string,
  jobState: string | undefined,
): T[] {
  if (!approvedProofId || paymentStatus !== "paid" || jobState !== "done")
    return [];
  return artifacts.filter((a) => a.proof_id === approvedProofId);
}
