export type QueueHealth = {
  queued: number;
  active: number;
  failed: number;
  expired: number;
  oldestQueuedAt: string | null;
};
export type OperationsHealth = {
  checkedAt: string;
  jobs: QueueHealth;
  emails: QueueHealth;
  deliveries: {
    id: string;
    order_id: string;
    order_number: number;
    kind: string;
    state: string;
    attempts: number;
    created_at: string;
    locked_until: string | null;
  }[];
};
export function queueAge(value: string | null, now = Date.now()) {
  if (!value) return "No queued work";
  const start = Date.parse(value);
  if (!Number.isFinite(start)) return "Age unavailable";
  const minutes = Math.max(0, Math.floor((now - start) / 60000));
  if (minutes < 1) return "Less than a minute";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return hours < 24
    ? `${hours} hr ${minutes % 60} min`
    : `${Math.floor(hours / 24)} day${Math.floor(hours / 24) === 1 ? "" : "s"} ${hours % 24} hr`;
}
