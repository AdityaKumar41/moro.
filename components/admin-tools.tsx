"use client";
import styles from "./admin-tools.module.css";
import { requestJson as post } from "@/lib/client-request";
import { queueAge, type OperationsHealth } from "@/lib/operations";
import { useEffect, useState } from "react";
import { useCatalog } from "./catalog-provider";
import { defaultConfig, type Product } from "@/lib/catalog";
type Staff = { id: string; name: string; company: string; role: string };
type Job = {
  id: string;
  state: string;
  kind: string;
  attempts: number;
  order_id: string;
  last_error: string | null;
};
export function AdminTools() {
  const catalogue = useCatalog();
  const [tab, setTab] = useState("products");
  const [users, setUsers] = useState<Staff[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [health, setHealth] = useState<OperationsHealth>();
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [templates, setTemplates] = useState<
    { id: string; name: string; product_id: string }[]
  >([]);
  const [message, setMessage] = useState("");
  const [current, setCurrent] = useState<Product>(catalogue[0]);
  const [busy, setBusy] = useState(false);
  async function refresh() {
    setRefreshing(true);
    try {
      const d = await post("/api/admin");
      setUsers(d.profiles);
      setJobs(d.jobs);
      setTemplates(d.templates);
      setHealth(d.health);
      return true;
    } catch (e) {
      setMessage((e as Error).message);
      return false;
    } finally {
      setRefreshing(false);
      setLoaded(true);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  async function mutate(body: unknown) {
    setBusy(true);
    try {
      await post("/api/admin", body);
      const refreshed = await refresh();
      setMessage(
        refreshed
          ? "Updated successfully."
          : "The update was saved. Refresh to see the latest state.",
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={styles.tools}>
      <h2 className="panel-title">Behind the good work.</h2>
      <nav className={styles.tabs} aria-label="Store management sections">
        {[
          "products",
          "users",
          "templates",
          "render jobs",
          "service health",
        ].map((t) => (
          <button
            key={t}
            className={tab === t ? "selected" : ""}
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
          >
            {t}
          </button>
        ))}
      </nav>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      {tab === "templates" && (
        <p className="editor-caption">
          Published layouts are available to everyone in the studio. Customer
          saved designs stay private.
        </p>
      )}
      {!loaded && tab !== "products" ? (
        <div
          className={styles.loading}
          role="status"
          aria-label="Loading management records"
        >
          {[1, 2, 3].map((n) => (
            <div className="skeleton-block" key={n} />
          ))}
        </div>
      ) : tab === "products" ? (
        <>
          <div className={styles.productToolbar}>
            <label>
              Product definition
              <select
                value={current.id}
                onChange={(e) =>
                  setCurrent(catalogue.find((p) => p.id === e.target.value)!)
                }
              >
                {catalogue.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="text-link"
              onClick={() =>
                setCurrent({
                  ...catalogue[0],
                  id: "new-division",
                  name: "New division",
                  short: "New",
                  approved: false,
                })
              }
            >
              Add a division
            </button>
          </div>
          <form
            className={styles.productForm}
            key={current.id}
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                const f = new FormData(e.currentTarget);
                const definition = {
                  ...current,
                  id: f.get("id"),
                  name: f.get("name"),
                  short: f.get("short"),
                  description: f.get("description"),
                  material: String(f.get("material"))
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                  width: Number(f.get("width")),
                  height: Number(f.get("height")),
                  rate: Math.round(Number(f.get("rate")) * 100),
                  setup: Math.round(Number(f.get("setup")) * 100),
                  taxBps: Math.round(Number(f.get("tax")) * 100),
                  hsn: f.get("hsn"),
                  shape: f.get("shape"),
                  color: f.get("color"),
                  approved: f.get("approved") === "on",
                  printProfile: {
                    dpi: Number(f.get("dpi")),
                    bleedMm: Number(f.get("bleed")),
                  },
                };
                await post("/api/catalog", definition);
                setMessage(
                  "Product saved. Refresh the page to load the updated catalogue.",
                );
              } catch (e) {
                setMessage((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className={styles.formHeading}>
              <h3>Product details</h3>
              <p>
                Define the materials, pricing and print settings for this
                division.
              </p>
            </div>
            <div className="field-row">
              <label>
                Product ID
                <input
                  name="id"
                  defaultValue={current.id}
                  required
                  pattern="[a-z][a-z0-9-]{1,39}"
                />
              </label>
              <label>
                Product name
                <input
                  name="name"
                  defaultValue={current.name}
                  required
                  maxLength={80}
                />
              </label>
            </div>
            <label>
              Short name
              <input
                name="short"
                defaultValue={current.short}
                required
                maxLength={40}
              />
            </label>
            <label>
              Description
              <input
                name="description"
                defaultValue={current.description}
                required
                minLength={5}
                maxLength={180}
              />
            </label>
            <label>
              Materials, separated by commas
              <input
                name="material"
                defaultValue={current.material.join(", ")}
                required
              />
            </label>
            <div className="field-row">
              <label>
                Reference width (mm)
                <input
                  name="width"
                  type="number"
                  min={10}
                  max={300}
                  defaultValue={current.width}
                  required
                />
              </label>
              <label>
                Reference height (mm)
                <input
                  name="height"
                  type="number"
                  min={10}
                  max={300}
                  defaultValue={current.height}
                  required
                />
              </label>
            </div>
            <div className="field-row">
              <label>
                Base unit price (INR)
                <input
                  name="rate"
                  type="number"
                  min={0.01}
                  step={0.01}
                  defaultValue={(current.rate / 100).toFixed(2)}
                  required
                />
              </label>
              <label>
                Setup charge (INR)
                <input
                  name="setup"
                  type="number"
                  min={0}
                  step={0.01}
                  defaultValue={(current.setup / 100).toFixed(2)}
                  required
                />
              </label>
            </div>
            <div className="field-row">
              <label>
                GST (%)
                <input
                  name="tax"
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  defaultValue={(current.taxBps ?? 1800) / 100}
                  required
                />
              </label>
              <label>
                Approved HSN/SAC
                <input
                  name="hsn"
                  defaultValue={current.hsn || ""}
                  maxLength={12}
                />
              </label>
            </div>
            <div className="field-row">
              <label>
                Display colour
                <input type="color" name="color" defaultValue={current.color} />
              </label>
              <label>
                Illustration
                <select name="shape" defaultValue={current.shape}>
                  {["label", "race", "mtb", "stamp", "trophy", "laser"].map(
                    (s) => (
                      <option key={s}>{s}</option>
                    ),
                  )}
                </select>
              </label>
            </div>
            <div className="field-row">
              <label>
                Print resolution
                <select
                  name="dpi"
                  defaultValue={current.printProfile?.dpi ?? 300}
                >
                  <option value={300}>300 DPI</option>
                  <option value={150}>150 DPI</option>
                </select>
              </label>
              <label>
                Bleed (mm)
                <input
                  name="bleed"
                  type="number"
                  min={0}
                  max={10}
                  step={0.1}
                  required
                  defaultValue={current.printProfile?.bleedMm ?? 3}
                />
              </label>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input
                style={{ width: 18, margin: 0 }}
                type="checkbox"
                name="approved"
                defaultChecked={current.approved}
              />{" "}
              Prices and tax classification have been approved
            </label>
            <button className="button" disabled={busy}>
              {busy ? "Saving product…" : "Save product"}
            </button>
            <p className="editor-caption">
              The base unit price scales with area; alternative materials
              receive a 25% multiplier. Volume tiers apply at 100, 250 and 500
              units. Store activation is a separate server setting.
            </p>
          </form>
        </>
      ) : tab === "users" ? (
        <>
          <p className="editor-caption">
            The latest 200 account profiles. Changes are audited. The final
            administrator cannot be demoted.
          </p>
          {!users.length && (
            <div className={styles.empty}>
              <h3>No accounts to display.</h3>
              <p>New customer profiles will appear here.</p>
            </div>
          )}
          {users.map((u) => (
            <article className={styles.card} key={u.id}>
              <h3>{u.name || "Unnamed account"}</h3>
              <p className="editor-caption">
                {u.id} · {u.company || "Individual"}
              </p>
              <label>
                Access role
                <select
                  value={u.role}
                  disabled={busy}
                  onChange={(e) =>
                    mutate({ action: "role", id: u.id, role: e.target.value })
                  }
                >
                  <option value="customer">Customer</option>
                  <option value="admin">Administrator</option>
                </select>
              </label>
            </article>
          ))}
        </>
      ) : tab === "templates" ? (
        <>
          <p className="editor-caption">
            Create shared templates with “Save as template” in the design
            studio. Removing a template does not change existing orders or
            proofs.
          </p>
          {!templates.length && (
            <div className={styles.empty}>
              <h3>A starting point for every idea.</h3>
              <p>
                Create a shared layout using Save as template in the studio.
              </p>
            </div>
          )}
          {templates.map((t) => (
            <article className={styles.card} key={t.id}>
              <h3>{t.name}</h3>
              <p>{t.product_id}</p>
              <button
                className="button outline small"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const r = await fetch("/api/templates", {
                      method: "DELETE",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: t.id }),
                    });
                    const d = await r.json();
                    if (!r.ok) throw Error(d.error);
                    await refresh();
                    setMessage("Template removed.");
                  } catch (e) {
                    setMessage((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Remove template
              </button>
            </article>
          ))}
        </>
      ) : tab === "service health" ? (
        <section aria-label="Service health" aria-busy={refreshing}>
          <div className="ops-health-heading">
            <div>
              <h3>Keep the good work moving.</h3>
              <p className="editor-caption">
                Queue totals and the 50 most recent emails. Failed deliveries
                need attention; queued work is picked up by the worker.
              </p>
            </div>
            <button
              className="button outline small"
              disabled={refreshing || busy}
              onClick={() => void refresh()}
            >
              {refreshing ? "Refreshing…" : "Refresh health"}
            </button>
          </div>
          {!health ? (
            <p role="status">
              {refreshing
                ? "Loading service health…"
                : "Health is unavailable. Refresh to try again."}
            </p>
          ) : (
            <>
              <p className="editor-caption">
                Checked {new Date(health.checkedAt).toLocaleString("en-IN")}.
                Counts are a snapshot.
              </p>
              {(
                [
                  ["Artwork", health.jobs],
                  ["Email", health.emails],
                ] as const
              ).map(([title, queue]) => (
                <section
                  key={title}
                  className="ops-queue"
                  aria-label={`${title} queue`}
                >
                  <h4>{title}</h4>
                  <dl className="ops-health-grid">
                    {(
                      [
                        ["Queued", queue.queued],
                        ["In progress", queue.active],
                        ["Failed", queue.failed],
                        ["Expired leases", queue.expired],
                      ] as const
                    ).map(([label, count]) => (
                      <div
                        key={label}
                        className={
                          label === "Failed" && count > 0 ? "ops-attention" : ""
                        }
                      >
                        <dt>{label}</dt>
                        <dd>{count}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="editor-caption">
                    Oldest queued:{" "}
                    {queueAge(
                      queue.oldestQueuedAt,
                      Date.parse(health.checkedAt),
                    )}
                    . Expired leases are eligible for worker recovery.
                  </p>
                </section>
              ))}
              <h4>Email delivery</h4>
              <p className="editor-caption">
                Sent means the provider accepted the message. Inbox placement is
                verified separately. Before retrying a failed delivery, resolve
                the sender or recipient issue.
              </p>
              {health.deliveries.length === 0 ? (
                <p>No email deliveries yet.</p>
              ) : (
                <div className="ops-delivery-list">
                  {health.deliveries.map((n) => (
                    <article className={styles.card} key={n.id}>
                      <div className="ops-delivery-title">
                        <h5>
                          DH-{n.order_number} · {n.kind.replaceAll("_", " ")}
                        </h5>
                        <span className="badge">{n.state}</span>
                      </div>
                      <p className="editor-caption">
                        {n.attempts} delivery attempt
                        {n.attempts === 1 ? "" : "s"} ·{" "}
                        {new Date(n.created_at).toLocaleString("en-IN")}
                      </p>
                      {n.state === "failed" && (
                        <button
                          className="button outline small"
                          disabled={busy || refreshing}
                          onClick={async () => {
                            setBusy(true);
                            setMessage("Queuing this delivery…");
                            try {
                              await post("/api/admin", {
                                action: "retry-email",
                                id: n.id,
                              });
                              const refreshed = await refresh();
                              setMessage(
                                refreshed
                                  ? "Delivery queued. The worker will retry this message."
                                  : "Delivery queued. Refresh to see its latest state.",
                              );
                            } catch (e) {
                              setMessage((e as Error).message);
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          {busy ? "Working…" : "Retry delivery"}
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      ) : (
        <>
          <p className="editor-caption">
            Jobs retry four times automatically. A failed job can be retried
            after resolving its error.
          </p>
          <button
            className="button small"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await post("/api/worker", {});
                setMessage(`Processed ${r.batches} batches.`);
                await refresh();
              } catch (e) {
                setMessage((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Processing artwork…" : "Process queued artwork"}
          </button>
          <button
            className="button outline small"
            disabled={refreshing || busy}
            onClick={refresh}
          >
            {refreshing ? "Refreshing…" : "Refresh jobs"}
          </button>
          {!jobs.length && (
            <div className={styles.empty}>
              <h3>The queue is clear.</h3>
              <p>Artwork jobs appear here after payment or a proof revision.</p>
            </div>
          )}
          {jobs.map((j) => (
            <article className={styles.card} key={j.id}>
              <span className="badge">{j.state}</span>
              <h3>
                {j.kind} · {j.order_id.slice(0, 8)}
              </h3>
              <p>Attempts: {j.attempts}</p>
              {j.last_error && <p className="notice">{j.last_error}</p>}
              {j.state === "failed" && (
                <button
                  className="button small"
                  disabled={busy}
                  onClick={() => mutate({ action: "retry", id: j.id })}
                >
                  Retry job
                </button>
              )}
            </article>
          ))}
        </>
      )}
    </section>
  );
}
