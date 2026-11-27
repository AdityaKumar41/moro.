"use client";
import { TestPaymentGuide } from "./test-payment-guide";
import {
  CHECKOUT_RETURN_KEY,
  validReturnOrder,
  paymentReturnNotice,
} from "@/lib/checkout-guidance";
import { requestJson as request } from "@/lib/client-request";
import { businessDate } from "@/lib/business-date";
import type { DesignResources } from "@/lib/design-resources";
import { needsProofApproval } from "@/lib/project-status";
import { ProofImage } from "./proof-image";
import { WorkspaceSkeleton } from "./workspace-loading";
import { ArtworkThumbnail } from "./artwork-thumbnail";
import { Dialog } from "./dialog";
import { PrintPoster } from "./print-poster";
import { FlowerYellow, LoopRibbon } from "trazo-stickers";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Package,
  PenTool,
  UserRound,
  Files,
  RefreshCw,
  ShieldCheck,
  LogOut,
  LayoutGrid,
  ArrowUpRight,
  Plus,
  Search,
} from "lucide-react";
import {
  money,
  stages,
  divisions,
  type Artwork,
  type Configuration,
} from "@/lib/catalog";
import { signOut } from "@/app/auth/actions";
type Proof = {
  id: string;
  version: number;
  state: string;
  comment?: string;
  approved_at?: string;
  artwork: Artwork;
};
type Order = {
  id: string;
  number: number;
  customer_id: string;
  created_at: string;
  status: (typeof stages)[number];
  payment_status: string;
  pricing?: { sandbox?: boolean };
  approved_proof_id: string | null;
  production_state?: string;
  configuration: Configuration;
  artwork: Artwork;
  total: number;
  currency: string;
  variable_data: Record<string, string>[];
  proofs: Proof[];
  artifacts: {
    id: string;
    kind: string;
    row_number: number;
    proof_id: string;
  }[];
  upload_path?: string;
  shipping: { name: string; email: string };
};
type Profile = {
  id: string;
  name: string;
  company: string;
  gstin: string;
  email: string;
  role: string;
};
type Design = {
  resources?: DesignResources;
  id: string;
  name: string;
  created_at: string;
  artwork: Artwork;
  configuration: Configuration;
};
import { useCatalog } from "./catalog-provider";
import { IntegrationStatus } from "./integration-status";
import { AdminTools } from "./admin-tools";
export default function Dashboard({ admin = false }: { admin?: boolean }) {
  const divisions = useCatalog();
  const [profile, setProfile] = useState<Profile>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [report, setReport] = useState<{
    orders: number;
    revenue: number;
    completed: number;
    throughput: Record<string, number>;
  }>();
  const [designs, setDesigns] = useState<Design[]>([]);
  const [tab, setTab] = useState(admin ? "orders" : "overview");
  const [loadError, setLoadError] = useState("");
  const [projectSearch, setProjectSearch] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [busyLabel, setBusyLabel] = useState("");
  const [checkoutPreview, setCheckoutPreview] = useState<Order>();
  const [paymentReturn, setPaymentReturn] = useState({
    kind: "",
    orderId: null as string | null,
  });
  const [confirmationTimedOut, setConfirmationTimedOut] = useState(false);
  const confirmationAttempts = useRef(0);
  useEffect(() => {
    if (admin) return;
    const query = new URLSearchParams(location.search);
    const kind = query.get("payment");
    if (!["processing", "cancelled"].includes(kind || "")) return;
    let saved = null;
    try {
      saved = sessionStorage.getItem(CHECKOUT_RETURN_KEY);
    } catch {}
    setPaymentReturn({
      kind: kind!,
      orderId: validReturnOrder(query.get("order")) || validReturnOrder(saved),
    });
    setTab("orders");
  }, [admin]);
  const paymentInFlight = useRef(false);
  useEffect(() => {
    if (!busy) setBusyLabel("");
  }, [busy]);
  useEffect(() => {
    const reset = () => {
      paymentInFlight.current = false;
      setBusy("");
      setBusyLabel("");
    };
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [family, setFamily] = useState("all");
  const [date, setDate] = useState("");
  const [proofReadyKey, setProofReadyKey] = useState("");
  const [proofView, setProofView] = useState<{
    order: Order;
    proof: Proof;
    row: number;
  }>();
  async function load() {
    try {
      setLoadError("");
      const [p, rows, extra] = await Promise.all([
        request("/api/profile"),
        request("/api/orders"),
        request(admin ? "/api/reports" : "/api/designs"),
      ]);
      if (admin && p.role !== "admin")
        throw Error("Administrator access is required.");
      setProfile(p);
      setOrders(rows);
      setHasMore(rows.length === 200);
      if (admin) setReport(extra);
      else setDesigns(extra);
      setMessage("");
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []); // Refresh is explicit; live payment confirmation is never inferred from redirects.
  const returnedOrder = orders.find((o) => o.id === paymentReturn.orderId);
  useEffect(() => {
    if (
      loading ||
      paymentReturn.kind !== "processing" ||
      !paymentReturn.orderId
    )
      return;
    if (returnedOrder && returnedOrder.payment_status !== "unpaid") {
      try {
        sessionStorage.removeItem(CHECKOUT_RETURN_KEY);
      } catch {}
      return;
    }
    if (confirmationAttempts.current >= 10) {
      setConfirmationTimedOut(true);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      confirmationAttempts.current++;
      try {
        const rows = await request("/api/orders");
        if (!cancelled) setOrders(rows);
      } catch {
        if (!cancelled) setConfirmationTimedOut(true);
      }
    }, 3000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [loading, paymentReturn, returnedOrder, orders]);
  async function action(o: Order, body: unknown) {
    setBusy(o.id);
    try {
      await request("/api/orders/" + o.id, body);
      setProofView(undefined);
      await load();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  const receiptRequests = useRef<Record<string, string>>({});
  const receiptInFlight = useRef(false);
  async function emailReceipt(o: Order) {
    if (receiptInFlight.current || busy) return;
    receiptInFlight.current = true;
    setBusy(o.id);
    setBusyLabel("Preparing your receipt email…");
    setMessage("");
    const requestId = (receiptRequests.current[o.id] ||= crypto.randomUUID());
    try {
      const result = await request(`/api/orders/${o.id}/invoice`, {
        requestId,
      });
      delete receiptRequests.current[o.id];
      setMessage(
        result.state === "sent"
          ? "Receipt emailed to your account address."
          : "Your receipt email is queued for your account address. Delivery may take a moment.",
      );
    } catch (e) {
      setMessage((e as Error).message);
      // A definitive HTTP failure can be retried as a new request; ambiguous
      // network errors retain the id to avoid sending two copies.
      if ((e as Error).message.includes("Request a new receipt"))
        delete receiptRequests.current[o.id];
    } finally {
      receiptInFlight.current = false;
      setBusy("");
      setBusyLabel("");
    }
  }
  async function pay(o: Order) {
    if (paymentInFlight.current || busy) return;
    paymentInFlight.current = true;
    setBusyLabel("Opening secure checkout…");
    setMessage("");
    setBusy(o.id);
    try {
      const p = await request("/api/checkout", { orderId: o.id });
      try {
        sessionStorage.setItem(CHECKOUT_RETURN_KEY, p.orderId || o.id);
      } catch {}
      location.assign(p.url);
    } catch (e) {
      setMessage((e as Error).message);
      paymentInFlight.current = false;
      setBusyLabel("");
      setBusy("");
    }
  }
  async function reorder(o: Order) {
    setBusyLabel("Opening a copy in your studio…");
    setBusy(o.id);
    try {
      const data = await request("/api/orders/" + o.id + "/reorder", {});
      reuse(data);
    } catch (e) {
      setMessage((e as Error).message);
      setBusy("");
    }
  }
  function reuse(data: {
    configuration: Configuration;
    artwork: Artwork;
    id?: string;
  }) {
    sessionStorage.setItem(
      "dh-reuse",
      JSON.stringify({ ...data, proofOrderId: admin ? data.id : undefined }),
    );
    location.assign("/studio");
  }
  function exportCsv() {
    const escape = (v: unknown) =>
      '"' +
      String(v ?? "")
        .replaceAll('"', '""')
        .replace(/^[=+@-]/, "'$&") +
      '"';
    const header = [
      "InvoiceNumber",
      "ContactName",
      "EmailAddress",
      "InvoiceDate",
      "Currency",
      "Description",
      "Quantity",
      "NetAmount",
      "TaxAmount",
      "Total",
      "PaymentReference",
    ];
    const rows = orders
      .filter((o) => o.payment_status === "paid")
      .map((o) => [
        "DH-" + o.number,
        o.shipping.name,
        o.shipping.email,
        businessDate(o.created_at),
        o.currency,
        o.configuration.productId,
        o.configuration.quantity,
        (o as unknown as { pricing: { net: number } }).pricing.net / 100,
        (o as unknown as { pricing: { tax: number } }).pricing.tax / 100,
        o.total / 100,
        (o as unknown as { payment_ref: string }).payment_ref,
      ]);
    const blob = new Blob(
      [
        "\uFEFF" +
          [header, ...rows].map((r) => r.map(escape).join(",")).join("\r\n"),
      ],
      { type: "text/csv;charset=utf-8" },
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "digital-heroes-accounting.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }
  const filtered = orders.filter(
    (o) =>
      (status === "all" || o.status === status) &&
      (family === "all" || o.configuration.productId === family) &&
      (!date || businessDate(o.created_at) === date) &&
      `DH-${o.number} ${o.id} ${o.customer_id} ${o.shipping?.name} ${o.shipping?.email}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const awaitingProofs = orders.filter(needsProofApproval);
  const matchingDesigns = designs.filter((d) =>
    (
      d.name +
      " " +
      (divisions.find((p) => p.id === d.configuration.productId)?.name || "")
    )
      .toLowerCase()
      .includes(projectSearch.toLowerCase()),
  );
  function projectCards(items: Design[]) {
    return (
      <div className="saved-grid">
        {items.map((d) => (
          <article className="saved-card" key={d.id}>
            <button
              className="project-preview"
              onClick={() => reuse(d)}
              aria-label={"Open " + d.name}
            >
              <ArtworkThumbnail
                artwork={d.artwork}
                configuration={d.configuration}
              />
              <span>
                Open in studio <ArrowUpRight size={16} />
              </span>
            </button>
            <div className="project-card-copy">
              <span className="tag">
                {divisions.find((p) => p.id === d.configuration.productId)
                  ?.name || "Custom print"}
              </span>
              <h3>{d.name}</h3>
              <p className="editor-caption">
                {d.configuration.width} × {d.configuration.height} mm ·{" "}
                {d.configuration.material}
              </p>
              <button className="project-open" onClick={() => reuse(d)}>
                Continue editing <ArrowUpRight size={15} />
              </button>
            </div>
          </article>
        ))}
      </div>
    );
  }
  if (loading && !profile) return <WorkspaceSkeleton />;
  if (!profile || (admin && profile.role !== "admin"))
    return (
      <section className="workspace-error">
        <ShieldCheck size={30} />
        <h1>We couldn’t open your workspace.</h1>
        <p>{loadError || message || "Please sign in to continue."}</p>
        <button
          className="button"
          onClick={() => {
            setLoading(true);
            void load();
          }}
        >
          Try again
        </button>
        <Link href="/auth?next=/account">Return to sign in</Link>
      </section>
    );
  return (
    <section className="moro-projects">
      {busy && (
        <div className="workspace-action-status" role="status">
          <span className="busy-dot" aria-hidden="true" />
          {busyLabel || "Updating your workspace…"}
        </div>
      )}
      <header className="projects-appbar">
        <Link href="/" className="moro-logo" aria-label="Moro home">
          moro<span>.</span>
        </Link>
        <span className="workspace-purpose">
          {admin ? "Production workspace" : "Your print workspace"}
        </span>
        <div>
          <Link href="/products">Browse products</Link>
          <span className="profile-avatar" aria-label={profile.name}>
            {profile.name.slice(0, 1).toUpperCase()}
          </span>
        </div>
      </header>
      <div className="dashboard-top">
        <div>
          <div className="eyebrow">
            {admin ? "THE PRODUCTION FLOOR" : "DESIGN. ORDER. MAKE IT REAL."}
          </div>
          <h1 className="page-title">
            {admin ? "Good work, in motion." : "Your projects."}
          </h1>
          <p className="projects-description">
            {admin
              ? "Orders, artwork and production in one place."
              : "Your saved designs, print orders and artwork approvals. All together."}
          </p>
        </div>
        <Link href="/studio?new=1" className="button">
          <Plus size={16} /> New print project
        </Link>
      </div>
      {loadError && (
        <div className="notice" role="alert">
          {loadError} <button onClick={() => void load()}>Retry</button>
        </div>
      )}
      {paymentReturn.kind && (
        <p className="notice payment-return-notice" role="status">
          {paymentReturnNotice(
            paymentReturn.kind,
            returnedOrder,
            confirmationTimedOut || !paymentReturn.orderId,
          )}
        </p>
      )}
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      <div className="dashboard-grid">
        <aside className="dashboard-side">
          {(admin
            ? [
                [Package, "orders", "Production queue"],
                [Files, "reports", "Reports"],
                [UserRound, "management", "Store management"],
                [Files, "integrations", "Service connections"],
                [UserRound, "profile", "Profile"],
              ]
            : [
                [LayoutGrid, "overview", "Overview"],
                [PenTool, "designs", "My designs"],
                [Package, "orders", "Orders"],

                [Files, "proofs", "Proof approvals"],
                [UserRound, "profile", "Account & profile"],
              ]
          ).map(([Icon, id, label]) => {
            const I = Icon as typeof Package;
            return (
              <button
                key={String(id)}
                onClick={() => setTab(String(id))}
                aria-current={tab === id ? "page" : undefined}
                className={tab === id ? "selected" : ""}
              >
                <I size={18} />
                {String(label)}
                {id === "proofs" && awaitingProofs.length > 0 && (
                  <span className="nav-count">{awaitingProofs.length}</span>
                )}
              </button>
            );
          })}
          <button
            onClick={() => {
              void load();
            }}
          >
            <RefreshCw size={18} />
            Refresh
          </button>
          {!admin && profile.role === "admin" && (
            <Link className="text-link" href="/admin">
              Production console
            </Link>
          )}
          <form action={signOut}>
            <button>Sign out</button>
          </form>
        </aside>
        <div className="projects-content">
          {tab === "overview" && !admin ? (
            <>
              <div className="projects-welcome">
                <div>
                  <span className="eyebrow">
                    WELCOME BACK,{" "}
                    {profile.name.split(" ")[0].toUpperCase() || "MAKER"}
                  </span>
                  <h2>
                    From a good idea
                    <br />
                    to <em>something real.</em>
                  </h2>
                  <p>
                    Start a print project, save your design and follow it all
                    the way to your door.
                  </p>
                  <Link href="/products" className="button">
                    Choose a product <ArrowUpRight size={16} />
                  </Link>
                </div>
                <div className="welcome-print">
                  <div className="welcome-orbit" />
                  <FlowerYellow
                    size={74}
                    color="#2f54b8"
                    className="welcome-flower"
                  />
                  <div className="welcome-poster">
                    <PrintPoster kind="labels" />
                  </div>
                  <LoopRibbon
                    size={60}
                    color="#d55236"
                    className="welcome-ribbon"
                  />
                </div>
              </div>
              <div className="project-counts">
                <button onClick={() => setTab("designs")}>
                  <PenTool size={19} />
                  <strong>{designs.length}</strong>
                  <span>Saved designs</span>
                  <ArrowUpRight size={15} />
                </button>
                <button onClick={() => setTab("orders")}>
                  <Package size={19} />
                  <strong>
                    {orders.filter((o) => o.status !== "completed").length}
                  </strong>
                  <span>Active orders</span>
                  <ArrowUpRight size={15} />
                </button>
                <button onClick={() => setTab("proofs")}>
                  <Files size={19} />
                  <strong>{awaitingProofs.length}</strong>
                  <span>Proofs to approve</span>
                  <ArrowUpRight size={15} />
                </button>
              </div>
              {awaitingProofs.length > 0 && (
                <div className="proof-callout">
                  <ShieldCheck size={22} />
                  <div>
                    <strong>Your artwork needs a final look.</strong>
                    <p>
                      Review your proof before your order goes into production.
                    </p>
                  </div>
                  <button className="button" onClick={() => setTab("proofs")}>
                    Review proofs
                  </button>
                </div>
              )}
              <div className="projects-section-head">
                <h2>Pick up where you left off</h2>
                <button onClick={() => setTab("designs")}>
                  All designs <ArrowUpRight size={15} />
                </button>
              </div>
              {designs.length ? (
                projectCards(designs.slice(0, 3))
              ) : (
                <div className="empty-state">
                  <PenTool size={28} />
                  <h3>Your first project starts with an idea.</h3>
                  <p>
                    Choose from labels, event numbers, boards, stamps, awards
                    and laser-cut work.
                  </p>
                  <Link className="button" href="/products">
                    Find your canvas
                  </Link>
                </div>
              )}
              <div className="projects-how">
                <span>
                  01 <b>Design your print</b>
                </span>
                <span>
                  02 <b>Place your order</b>
                </span>
                <span>
                  03 <b>Approve your proof</b>
                </span>
                <span>
                  04 <b>We make it</b>
                </span>
              </div>
            </>
          ) : tab === "integrations" ? (
            <IntegrationStatus />
          ) : tab === "management" ? (
            <AdminTools />
          ) : tab === "profile" ? (
            <>
              <h2 className="panel-title">Make yourself at home.</h2>
              <p className="lead" style={{ fontSize: 14 }}>
                {profile.email} · {profile.role} account
              </p>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy("profile");
                  try {
                    await request("/api/profile", {
                      name: profile.name,
                      company: profile.company,
                      gstin: profile.gstin,
                    });
                    setMessage("Your profile has been updated.");
                  } catch (e) {
                    setMessage((e as Error).message);
                  }
                  setBusy("");
                }}
              >
                <label>
                  Your name
                  <input
                    value={profile.name}
                    required
                    onChange={(e) =>
                      setProfile({ ...profile, name: e.target.value })
                    }
                  />
                </label>
                <label>
                  Company
                  <input
                    value={profile.company}
                    onChange={(e) =>
                      setProfile({ ...profile, company: e.target.value })
                    }
                  />
                </label>
                <label>
                  GSTIN
                  <input
                    value={profile.gstin}
                    maxLength={15}
                    onChange={(e) =>
                      setProfile({ ...profile, gstin: e.target.value })
                    }
                  />
                </label>
                <button
                  className="button"
                  disabled={!!busy}
                  aria-busy={busy === "profile"}
                >
                  Save details
                </button>
              </form>
              <Link className="text-link" href="/auth">
                Request a password reset
              </Link>
              <form action={signOut} className="profile-signout">
                <button className="button outline">
                  <LogOut size={15} />
                  Sign out
                </button>
              </form>
            </>
          ) : tab === "designs" ? (
            <>
              <div className="projects-section-head">
                <div>
                  <h2 className="panel-title">My designs</h2>
                  <p>Saved artwork and product settings, ready when you are.</p>
                </div>
                <label className="project-search">
                  <Search size={16} />
                  <input
                    aria-label="Search saved designs"
                    placeholder="Find a design…"
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                  />
                </label>
              </div>
              {projectCards(matchingDesigns)}
              {designs.length > 0 && !matchingDesigns.length && (
                <div className="empty-state">
                  <h3>No designs found.</h3>
                  <p>Try a different name or product.</p>
                  <button
                    className="button outline"
                    onClick={() => setProjectSearch("")}
                  >
                    Clear search
                  </button>
                </div>
              )}
              {!designs.length && (
                <div className="empty-state">
                  <PenTool size={30} />
                  <h2>A home for your ideas.</h2>
                  <p>Save a design in the studio to find it here.</p>
                  <Link href="/studio" className="button">
                    Open the studio
                  </Link>
                </div>
              )}
            </>
          ) : tab === "reports" ? (
            <>
              <h2 className="panel-title">The bigger picture.</h2>
              <div className="stats">
                <div className="stat">
                  <span>Total orders</span>
                  <strong>{report?.orders ?? orders.length}</strong>
                </div>
                <div className="stat">
                  <span>Captured sales</span>
                  <strong>
                    {money(
                      report?.revenue ??
                        orders
                          .filter((o) => o.payment_status === "paid")
                          .reduce((s, o) => s + o.total, 0),
                    )}
                  </strong>
                </div>
                <div className="stat">
                  <span>Completed jobs</span>
                  <strong>
                    {report?.completed ??
                      orders.filter((o) => o.status === "completed").length}
                  </strong>
                </div>
              </div>
              <p className="editor-caption">
                Reports cover the full order history. Accounting export includes
                paid orders loaded in this view.
              </p>
              <button className="button outline" onClick={exportCsv}>
                Export accounting CSV
              </button>
              <div className="stats">
                {divisions.map((p) => (
                  <div className="stat" key={p.id}>
                    <span>{p.name}</span>
                    <strong>
                      {report?.throughput[p.id] ??
                        orders.filter(
                          (o) =>
                            o.configuration.productId === p.id &&
                            o.status === "completed",
                        ).length}
                    </strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              {admin && (
                <div className="stats">
                  <div className="stat">
                    <span>In the queue</span>
                    <strong>
                      {orders.filter((o) => o.status !== "completed").length}
                    </strong>
                  </div>
                  <div className="stat">
                    <span>Waiting for approval</span>
                    <strong>
                      {
                        orders.filter(
                          (o) => o.status === "proof" && !o.approved_proof_id,
                        ).length
                      }
                    </strong>
                  </div>
                  <div className="stat">
                    <span>Approved artwork</span>
                    <strong>
                      {
                        orders.filter(
                          (o) =>
                            o.approved_proof_id && o.payment_status === "paid",
                        ).length
                      }
                    </strong>
                  </div>
                </div>
              )}
              <h2 className="panel-title">
                {tab === "proofs"
                  ? "Proof approvals"
                  : admin
                    ? "The production queue."
                    : "Your print orders"}
              </h2>
              <div className="filter-row">
                <input
                  aria-label="Search orders"
                  placeholder={
                    admin
                      ? "Search order, customer or email"
                      : "Search your orders"
                  }
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <select
                  aria-label="Filter by status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="all">All stages</option>
                  {stages.map((s) => (
                    <option key={s} value={s}>
                      {
                        {
                          quote: "Quote",
                          order: "Order placed",
                          artwork: "Artwork preparation",
                          proof: "Proof review",
                          production: "In production",
                          completed: "Completed",
                        }[s]
                      }
                    </option>
                  ))}
                </select>
                {admin && (
                  <>
                    <select
                      aria-label="Filter by product"
                      value={family}
                      onChange={(e) => setFamily(e.target.value)}
                    >
                      <option value="all">All products</option>
                      {divisions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.short}
                        </option>
                      ))}
                    </select>
                    <input
                      style={{ maxWidth: 180 }}
                      type="date"
                      aria-label="Filter by order date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </>
                )}
              </div>
              {filtered
                .filter((o) => tab !== "proofs" || needsProofApproval(o))
                .map((o) => {
                  const latest = [...o.proofs].sort(
                    (a, b) => b.version - a.version,
                  )[0];
                  return (
                    <article className="order-card" key={o.id}>
                      <div className="order-head">
                        <div>
                          <h3>
                            {o.pricing?.sandbox && (
                              <small className="order-preview-label">
                                Preview ·{" "}
                              </small>
                            )}{" "}
                            DH-{o.number} ·{" "}
                            {
                              divisions.find(
                                (p) => p.id === o.configuration.productId,
                              )?.name
                            }
                          </h3>
                          <small>
                            {new Date(o.created_at).toLocaleDateString(
                              "en-IN",
                              { timeZone: "Asia/Kolkata" },
                            )}{" "}
                            {admin && "· " + o.shipping.name}
                          </small>
                        </div>
                        <span
                          className={
                            "badge " +
                            (o.payment_status !== "paid" ? "orange" : "")
                          }
                        >
                          {o.payment_status === "paid"
                            ? {
                                quote: "Quote",
                                order: "Order placed",
                                artwork: "Preparing artwork",
                                proof: "Proof review",
                                production: "In production",
                                completed: "Completed",
                              }[o.status]
                            : {
                                unpaid: "Awaiting payment",
                                refunded: "Refunded",
                                disputed: "Payment under review",
                              }[o.payment_status] || o.payment_status}
                        </span>
                      </div>
                      <div className="order-body">
                        <div
                          className="progress"
                          aria-label={`Current stage: ${o.status}`}
                        >
                          {stages.map((s, i) => (
                            <span
                              key={s}
                              className={
                                i <= stages.indexOf(o.status) ? "done" : ""
                              }
                            />
                          ))}
                        </div>
                        <p>
                          {o.configuration.quantity} pieces ·{" "}
                          {o.configuration.width} × {o.configuration.height} mm
                          · {o.configuration.material} ·{" "}
                          {money(o.total, o.currency)}
                        </p>
                        {latest && (
                          <p>
                            Proof v{latest.version} ·{" "}
                            <b>{latest.state.replaceAll("_", " ")}</b>
                            {latest.comment && ` · “${latest.comment}”`}
                            {latest.approved_at &&
                              " · Approved " +
                                new Date(latest.approved_at).toLocaleString(
                                  "en-IN",
                                )}
                          </p>
                        )}
                        {admin && (
                          <p>
                            <ShieldCheck size={15} />{" "}
                            {o.approved_proof_id && o.payment_status === "paid"
                              ? o.production_state === "done"
                                ? "Approved files ready to download"
                                : o.production_state === "failed"
                                  ? "Production rendering needs attention — check render jobs"
                                  : "Approved — production files are being prepared"
                              : "Production files locked until payment and proof approval"}
                          </p>
                        )}
                        <div className="order-actions">
                          {o.payment_status === "unpaid" && !admin && (
                            <button
                              className="button"
                              disabled={!!busy}
                              aria-busy={busy === o.id}
                              onClick={() => {
                                if (o.pricing?.sandbox) {
                                  setMessage("");
                                  setCheckoutPreview(o);
                                } else void pay(o);
                              }}
                            >
                              {busy === o.id
                                ? "Opening secure checkout…"
                                : "Complete payment"}
                            </button>
                          )}
                          {latest && latest.state !== "rendering" && (
                            <button
                              className="button outline"
                              onClick={() =>
                                setProofView({
                                  order: o,
                                  proof: latest,
                                  row: 1,
                                })
                              }
                            >
                              View proof v{latest.version}
                            </button>
                          )}
                          {o.payment_status === "paid" && !admin && (
                            <>
                              <a
                                className="button outline"
                                href={`/api/orders/${o.id}/invoice`}
                              >
                                Download receipt
                              </a>
                              <button
                                className="button outline"
                                disabled={!!busy}
                                aria-busy={
                                  busy === o.id && receiptInFlight.current
                                }
                                onClick={() => emailReceipt(o)}
                              >
                                {busy === o.id && receiptInFlight.current
                                  ? "Preparing email…"
                                  : "Email receipt"}
                              </button>
                            </>
                          )}
                          {o.approved_proof_id && !admin && (
                            <button
                              className="button outline"
                              disabled={!!busy}
                              aria-busy={busy === o.id}
                              onClick={() => reorder(o)}
                            >
                              {busy === o.id
                                ? "Opening your design…"
                                : "Reorder this design"}
                            </button>
                          )}
                          {admin &&
                            o.payment_status === "paid" &&
                            !["production", "completed"].includes(o.status) &&
                            !o.upload_path && (
                              <button
                                disabled={!!busy}
                                className="button outline"
                                onClick={() =>
                                  action(o, {
                                    action: "publish_proof",
                                    artwork: o.artwork,
                                  })
                                }
                              >
                                Publish {latest ? "new proof" : "proof"}
                              </button>
                            )}
                          {admin &&
                            o.payment_status === "paid" &&
                            !["production", "completed"].includes(o.status) && (
                              <button
                                className="button outline"
                                onClick={() => reuse(o)}
                              >
                                Edit & publish proof
                              </button>
                            )}
                          {admin && o.upload_path && (
                            <>
                              <a
                                className="button outline"
                                href={`/api/orders/${o.id}/files?upload=1`}
                              >
                                Download source for preflight
                              </a>
                              <button
                                className="button outline"
                                onClick={() => reuse(o)}
                              >
                                Edit proof in studio
                              </button>
                            </>
                          )}
                          {admin &&
                            ["order", "proof", "production"].includes(
                              o.status,
                            ) && (
                              <button
                                disabled={!!busy}
                                className="button"
                                onClick={() => action(o, { action: "advance" })}
                              >
                                Advance stage
                              </button>
                            )}
                        </div>
                        {admin &&
                          o.approved_proof_id &&
                          o.payment_status === "paid" && (
                            <details style={{ marginTop: 15 }}>
                              <summary>
                                Production files ({o.artifacts.length})
                              </summary>
                              {!o.artifacts.length && (
                                <p className="editor-caption">
                                  {o.production_state === "failed"
                                    ? "Rendering failed. Retry the job from Store management."
                                    : "Files are being prepared. Refresh when rendering completes."}
                                </p>
                              )}
                              <div className="order-actions">
                                {o.artifacts.map((a) => (
                                  <a
                                    className="button outline"
                                    key={a.id}
                                    href={`/api/orders/${o.id}/files?artifact=${a.id}`}
                                  >
                                    Row {a.row_number} · {a.kind.toUpperCase()}
                                  </a>
                                ))}
                              </div>
                            </details>
                          )}
                        {o.proofs.length > 1 && (
                          <details style={{ marginTop: 15 }}>
                            <summary>Proof history</summary>
                            <div className="order-actions">
                              {[...o.proofs]
                                .sort((a, b) => a.version - b.version)
                                .map((p) => (
                                  <button
                                    className="button outline"
                                    disabled={p.state === "rendering"}
                                    key={p.id}
                                    onClick={() =>
                                      setProofView({
                                        order: o,
                                        proof: p,
                                        row: 1,
                                      })
                                    }
                                  >
                                    v{p.version} · {p.state}
                                  </button>
                                ))}
                            </div>
                          </details>
                        )}
                      </div>
                    </article>
                  );
                })}
              {hasMore && (
                <button
                  className="button outline"
                  disabled={!!busy}
                  onClick={async () => {
                    setBusy("more");
                    try {
                      const rows = await request(
                        "/api/orders?offset=" + orders.length,
                      );
                      setOrders([...orders, ...rows]);
                      setHasMore(rows.length === 200);
                    } catch (e) {
                      setMessage((e as Error).message);
                    } finally {
                      setBusy("");
                    }
                  }}
                >
                  Load earlier orders
                </button>
              )}
              {!filtered.filter(
                (o) => tab !== "proofs" || needsProofApproval(o),
              ).length && (
                <div className="empty-state">
                  <Package size={32} />
                  <h2>
                    {orders.length
                      ? tab === "proofs"
                        ? "You’re all caught up."
                        : "No matching orders."
                      : "Something great starts here."}
                  </h2>
                  <p>
                    {orders.length
                      ? tab === "proofs"
                        ? "There are no artwork proofs awaiting your approval."
                        : "Try another search or filter."
                      : "Your orders and proofs will appear here once you’ve created your first project."}
                  </p>
                  <Link href="/studio" className="button">
                    Start creating
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {proofView && (
        <Dialog
          label="proof-review-title"
          onClose={() => setProofView(undefined)}
        >
          <div className="modal-heading">
            <h2 id="proof-review-title">
              DH-{proofView.order.number} · Proof v{proofView.proof.version}
            </h2>
            <button
              className="icon-button"
              aria-label="Close proof"
              onClick={() => setProofView(undefined)}
            >
              ×
            </button>
          </div>
          {proofView.order.variable_data.length > 0 && (
            <label>
              Inspect variable-data row
              <select
                value={proofView.row}
                onChange={(e) =>
                  setProofView({ ...proofView, row: Number(e.target.value) })
                }
              >
                {proofView.order.variable_data.map((_, i) => (
                  <option key={i} value={i + 1}>
                    Row {i + 1}
                  </option>
                ))}
              </select>
            </label>
          )}
          <ProofImage
            key={proofView.proof.id + ":" + proofView.row}
            onReady={() =>
              setProofReadyKey(proofView.proof.id + ":" + proofView.row)
            }
            width={proofView.order.configuration.width}
            height={proofView.order.configuration.height}
            alt={`Proof version ${proofView.proof.version}, row ${proofView.row}`}
            src={`/api/orders/${proofView.order.id}/files?proof=${proofView.proof.id}&row=${proofView.row}`}
          />
          <p className="editor-caption">
            Check the text, layout and every variable-data row. This
            server-rendered proof is the artwork used for production. Screen
            colour can differ from the printed material.
          </p>
          {!admin && proofView.proof.state === "ready" && (
            <>
              <button
                className="button full"
                disabled={
                  !!busy ||
                  proofReadyKey !== proofView.proof.id + ":" + proofView.row
                }
                onClick={() =>
                  action(proofView.order, {
                    action: "approve",
                    proofId: proofView.proof.id,
                  })
                }
              >
                Approve this proof for production
              </button>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const comment = new FormData(e.currentTarget).get("comment");
                  void action(proofView.order, {
                    action: "changes",
                    proofId: proofView.proof.id,
                    comment,
                  });
                }}
              >
                <label style={{ marginTop: 20 }}>
                  Need a change?
                  <textarea
                    name="comment"
                    minLength={5}
                    maxLength={2000}
                    required
                    placeholder="Tell us what should change…"
                  />
                </label>
                <button className="button outline" disabled={!!busy}>
                  Request a revision
                </button>
              </form>
            </>
          )}
          <p className="form-message" role="status">
            {message}
          </p>
        </Dialog>
      )}
      {checkoutPreview && (
        <Dialog
          label="payment-preview-title"
          onClose={() => {
            if (!busy) setCheckoutPreview(undefined);
          }}
        >
          <div className="modal-title-row">
            <h2 id="payment-preview-title">Continue to secure checkout.</h2>
            <button
              type="button"
              aria-label="Close payment details"
              disabled={!!busy}
              onClick={() => setCheckoutPreview(undefined)}
            >
              ×
            </button>
          </div>
          <p>
            DH-{checkoutPreview.number} ·{" "}
            {money(checkoutPreview.total, checkoutPreview.currency)}
          </p>
          <TestPaymentGuide
            enabled={checkoutPreview.pricing?.sandbox === true}
          />
          <button
            className="button full"
            disabled={!!busy}
            aria-busy={busy === checkoutPreview.id}
            onClick={() => void pay(checkoutPreview)}
          >
            {busy ? "Opening secure checkout…" : "Continue to Stripe"}
          </button>
          {message && (
            <p className="form-message" role="alert">
              {message}
            </p>
          )}
        </Dialog>
      )}
    </section>
  );
}
