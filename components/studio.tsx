"use client";
import { createDesignSaver } from "@/lib/design-save-queue";
import { TestPaymentGuide } from "./test-payment-guide";
import { CHECKOUT_RETURN_KEY } from "@/lib/checkout-guidance";
import { requestJson as api } from "@/lib/client-request";
import { importStudioImage, imageBox, ARTWORK_LIMIT } from "@/lib/studio-image";
import {
  applyLayerCommand,
  moveLayerTo,
  studioShortcut,
  type LayerCommand,
} from "@/lib/studio-commands";
import { InlineTextEditor } from "./inline-text-editor";
import { StudioContextMenu } from "./studio-context-menu";
import { starterLayouts } from "@/lib/starter-layouts";
import { NumberField } from "./number-field";
import { resourcesForOwner } from "@/lib/design-resources";
import {
  canvasFit,
  fitArtwork,
  fitLayer,
  type StudioSnapshot,
} from "@/lib/studio-geometry";
import { WorkspaceSkeleton } from "./workspace-loading";
import { ArtworkThumbnail } from "./artwork-thumbnail";
import { initialArtwork } from "@/lib/initial-artwork";
import { useAccount } from "./account-context";
import { Dialog } from "./dialog";
import {
  DRAFT_KEY,
  parseDraft,
  persistDraft,
  studioIssues,
} from "@/lib/studio-draft";
import { printFontFamily, layerTextGeometry } from "@/lib/print-text";
import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Type,
  ImagePlus,
  Save,
  Undo2,
  Redo2,
  Trash2,
  ShieldCheck,
  FileUp,
  X,
  Check,
  LockKeyhole,
  ArrowLeft,
  SlidersHorizontal,
  Layers,
  LayoutTemplate,
  ChevronRight,
  Copy,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  LockOpen,
  GripVertical,
} from "lucide-react";
import {
  divisions,
  defaultConfig,
  designSchema,
  configSchema,
  layerSchema,
  fitsPrintArea,
  money,
  type Artwork,
  type Configuration,
  type Layer,
  type ProductId,
} from "@/lib/catalog";
import { price } from "@/lib/pricing";
import { parse } from "csv-parse/browser/esm/sync";
import { useCatalog } from "./catalog-provider";
export default function Studio() {
  const divisions = useCatalog();
  const account = useAccount();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [guestEdits, setGuestEdits] = useState(0);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [savedFingerprint, setSavedFingerprint] = useState("");
  const [cloudState, setCloudState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const initialDocument = useRef<string | null>(null);
  const recoveredDocument = useRef(false);
  const saver = useRef(
    createDesignSaver((document: unknown) => api("/api/designs", document)),
  );
  const saveMounted = useRef(true);
  useEffect(() => {
    saveMounted.current = true;
    return () => {
      saveMounted.current = false;
    };
  }, []);
  const [hydrated, setHydrated] = useState(false);
  const [designId, setDesignId] = useState("");
  const draftOwner = useRef<string | null | undefined>(undefined);
  const [zoom, setZoom] = useState(100);
  const [draftStatus, setDraftStatus] = useState("Opening your draft…");
  const [authIntent, setAuthIntent] = useState<string | null>(null);
  const [future, setFuture] = useState<StudioSnapshot[]>([]);
  const params = useSearchParams();
  const router = useRouter();
  const product =
    divisions.find((p) => p.id === params.get("product"))?.id || "labels";
  const [configuration, setConfiguration] = useState<Configuration>(
    defaultConfig(product, divisions),
  );
  const [artwork, setArtwork] = useState<Artwork>(initialArtwork(product));
  const [proofOrderId, setProofOrderId] = useState<string>();
  const [selected, setSelected] = useState(artwork.layers[0]?.id || "");
  const [tab, setTab] = useState("configure");
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!/^(Your draft|Your design is here|Design saved)/.test(message)) return;
    const timer = setTimeout(() => setMessage(""), 5000);
    return () => clearTimeout(timer);
  }, [message]);
  const [pending, setPending] = useState(false);
  const [importingImage, setImportingImage] = useState(false);
  const replaceImage = useRef<string | null>(null);
  const [checkout, setCheckout] = useState(false);
  const [activity, setActivity] = useState("");
  const operation = useRef(false);
  const draggedLayer = useRef<string | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    id: string;
  } | null>(null);
  const studioRoot = useRef<HTMLDivElement>(null);
  const canvasElement = useRef<SVGSVGElement>(null);
  const [templates, setTemplates] = useState<
    { id: string; name: string; product_id: string; artwork: Artwork }[]
  >([]);
  const isAdmin = account.profile?.role === "admin";
  useEffect(() => {
    fetch("/api/templates")
      .then((r) => (r.ok ? r.json() : []))
      .then(setTemplates)
      .catch(() => {});
  }, []);
  const [variableData, setVariableData] = useState<Record<string, string>[]>(
    [],
  );
  const [uploadPath, setUploadPath] = useState<string>();
  const [uploadName, setUploadName] = useState("");
  const [previewRow, setPreviewRow] = useState(0);
  const [history, setHistory] = useState<StudioSnapshot[]>([]);
  const requestKey = useRef<{ key: string; fingerprint: string } | null>(null);
  const drag = useRef<{
    id: string;
    x: number;
    y: number;
    startX: number;
    startY: number;
    mode?: "resize";
    width?: number;
    height?: number;
    before?: StudioSnapshot;
    recorded?: boolean;
  } | null>(null);
  const board = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [frameSize, setFrameSize] = useState({ width: 800, height: 600 });
  useEffect(() => {
    if (!hydrated || !frame.current) return;
    const el = frame.current;
    const observer = new ResizeObserver(([entry]) =>
      setFrameSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hydrated]);
  const logoInput = useRef<HTMLInputElement>(null);
  const p =
    divisions.find((p) => p.id === configuration.productId) || divisions[0];
  const availableTemplates = [...templates, ...starterLayouts(configuration)];
  const selectedLayer = artwork.layers.find((l) => l.id === selected);
  const pricing = price(
    {
      ...configuration,
      productId: p.id,
      material: p.material.includes(configuration.material)
        ? configuration.material
        : p.material[0],
    },
    undefined,
    p,
  );
  const [quote, setQuote] = useState(pricing);
  const [quotedConfig, setQuotedConfig] = useState("");
  const [quoteError, setQuoteError] = useState("");
  const documentFingerprint = JSON.stringify({
    artwork,
    configuration,
    variableData,
    uploadPath,
    uploadName,
  });
  async function persistCurrentDesign() {
    const ownerId = account.profile?.id;
    if (!ownerId || (draftOwner.current && draftOwner.current !== ownerId))
      throw Error("Reload the studio before saving to this account.");
    const fingerprint = documentFingerprint;
    setCloudState("saving");
    try {
      const result = await saver.current({
        id: designId,
        ownerId,
        artwork,
        configuration,
        resources: { version: 1, variableData, uploadPath, uploadName },
      });
      if (saveMounted.current && draftOwner.current === ownerId) {
        setSavedFingerprint(fingerprint);
        setCloudState("saved");
      }
      return result;
    } catch (e) {
      if (saveMounted.current) setCloudState("error");
      throw e;
    }
  }
  useEffect(() => {
    if (
      !hydrated ||
      proofOrderId ||
      account.status !== "authenticated" ||
      !designId
    )
      return;
    if (initialDocument.current === null) {
      initialDocument.current = documentFingerprint;
      if (!recoveredDocument.current) return;
    }
    if (
      documentFingerprint === savedFingerprint ||
      (!recoveredDocument.current &&
        cloudState === "idle" &&
        documentFingerprint === initialDocument.current)
    )
      return;
    if (pending || importingImage) return;
    const timer = setTimeout(() => {
      void persistCurrentDesign().catch(() => {});
    }, 1500);
    return () => clearTimeout(timer);
  }, [
    hydrated,
    proofOrderId,
    account.status,
    account.profile?.id,
    designId,
    documentFingerprint,
    savedFingerprint,
    pending,
    importingImage,
  ]);
  const configKey = JSON.stringify(configuration);
  const quoteReady = quotedConfig === configKey && !quoteError;
  const issues = studioIssues(artwork, configuration, variableData);
  useEffect(() => {
    if (hydrated || ["loading", "error"].includes(account.status)) return;
    draftOwner.current = account.profile?.id || null;
    setDesignId(crypto.randomUUID());
    try {
      const fresh = params.get("new") === "1";
      const reuse = fresh ? null : sessionStorage.getItem("dh-reuse");
      const draft = fresh
        ? null
        : parseDraft(
            sessionStorage.getItem(DRAFT_KEY),
            account.profile?.id || null,
          );
      if (reuse) {
        recoveredDocument.current = true;
        const b = JSON.parse(reuse);
        const a = designSchema.parse(b.artwork),
          c = configSchema.parse(b.configuration);
        const resources = resourcesForOwner(
          b.resources || {
            variableData: b.variable_data || [],
            uploadPath: b.upload_path,
          },
          account.profile?.id || "guest",
        );
        setVariableData(resources.variableData);
        setUploadPath(resources.uploadPath);
        setUploadName(
          resources.uploadName ||
            (resources.uploadPath ? "Original source artwork" : ""),
        );
        setConfiguration(c);
        setArtwork(a);
        setSelected(a.layers[0]?.id || "");
        setProofOrderId(b.proofOrderId);
        if (
          !b.proofOrderId &&
          typeof b.id === "string" &&
          /^[0-9a-f-]{36}$/i.test(b.id)
        )
          setDesignId(b.id);
        sessionStorage.removeItem("dh-reuse");
      } else if (
        draft &&
        (!params.get("product") ||
          params.get("product") === draft.configuration.productId)
      ) {
        recoveredDocument.current = true;
        setConfiguration(draft.configuration);
        setArtwork(draft.artwork);
        setSelected(draft.artwork.layers[0]?.id || "");
        setVariableData(draft.variableData);
        setUploadPath(draft.uploadPath);
        setUploadName(draft.uploadName || "");
        setDesignId(draft.designId);
        setMessage(
          params.get("intent")
            ? "Your design is here. Continue when you’re ready."
            : "Your draft has been restored.",
        );
      }
    } catch {
      setMessage(
        "That draft could not be restored. Your saved projects are still in your account.",
      );
    }
    try {
      setNudgeDismissed(
        sessionStorage.getItem("moro-studio-nudge-dismissed") === "yes",
      );
    } catch {}
    setHydrated(true);
    if (params.get("new") === "1") {
      try {
        sessionStorage.removeItem("dh-reuse");
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {}
      router.replace("/studio?product=" + product);
    }
  }, [hydrated, account.status, account.profile?.id, params, router, product]);
  function keepDraft() {
    if (!hydrated || proofOrderId) return;
    if (draftOwner.current && draftOwner.current !== account.profile?.id)
      throw Error("Account changed. Reload before continuing.");
    if (account.profile?.id) draftOwner.current = account.profile.id;
    persistDraft(sessionStorage, {
      version: 1,
      updatedAt: Date.now(),
      ownerId: account.profile?.id || null,
      designId,
      configuration,
      artwork,
      variableData,
      uploadPath,
      uploadName,
    });
  }
  useEffect(() => {
    if (!hydrated || proofOrderId) return;
    const timer = setTimeout(() => {
      try {
        keepDraft();
        setDraftStatus("Draft kept in this tab · 24 hours");
      } catch {
        setDraftStatus(
          "Draft could not be kept in this tab. Sign in and save your project.",
        );
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [
    hydrated,
    designId,
    account.profile?.id,
    configuration,
    artwork,
    variableData,
    uploadPath,
    uploadName,
    proofOrderId,
  ]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const r = await fetch("/api/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: configKey,
          signal: controller.signal,
        });
        if (!r.ok) throw Error();
        const q = await r.json();
        if (!controller.signal.aborted) {
          setQuote(q);
          setQuotedConfig(configKey);
          setQuoteError("");
        }
      } catch {
        if (!controller.signal.aborted)
          setQuoteError(
            "Pricing is unavailable. Change a detail to retry before checkout.",
          );
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [configKey]);
  useEffect(() => {
    const reset = () => {
      operation.current = false;
      setPending(false);
      setActivity("");
    };
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);
  function requireAccount(intent: string) {
    if (!hydrated) {
      setMessage("Your studio is still opening. Please try again.");
      return false;
    }
    if (draftOwner.current && draftOwner.current !== account.profile?.id) {
      setMessage("Your account changed. Reload the studio before continuing.");
      return false;
    }
    if (account.status === "authenticated") return true;
    if (account.status === "loading") {
      setMessage("Checking your account…");
      return false;
    }
    if (account.status === "error") {
      setMessage("We couldn’t check your account. Please try again.");
      void account.refresh();
      return false;
    }
    try {
      keepDraft();
    } catch {
      setMessage(
        "Your draft could not be kept. Please allow browser storage before signing in.",
      );
      return false;
    }
    setReviewOpen(false);
    setAuthIntent(intent);
    return false;
  }
  function snapshot(): StudioSnapshot {
    return {
      artwork,
      configuration,
      variableData,
      uploadPath,
      uploadName,
      designId,
      selected,
    };
  }
  function restore(state: StudioSnapshot) {
    setArtwork(state.artwork);
    setConfiguration(state.configuration);
    setVariableData(state.variableData);
    setUploadPath(state.uploadPath);
    setUploadName(state.uploadName);
    setDesignId(state.designId);
    setSelected(
      state.artwork.layers.some((l) => l.id === state.selected)
        ? state.selected
        : state.artwork.layers[0]?.id || "",
    );
    requestKey.current = null;
  }
  function remember() {
    setHistory((h) => [...h.slice(-39), snapshot()]);
    setFuture([]);
    requestKey.current = null;
  }
  function undo() {
    if (!history.length) return;
    setFuture((f) => [snapshot(), ...f].slice(0, 40));
    restore(history[history.length - 1]);
    setHistory(history.slice(0, -1));
  }
  function redo() {
    if (!future.length) return;
    setHistory((h) => [...h.slice(-39), snapshot()]);
    restore(future[0]);
    setFuture(future.slice(1));
  }
  function configure(next: Configuration) {
    if (proofOrderId || JSON.stringify(next) === JSON.stringify(configuration))
      return;
    try {
      const fitted = fitArtwork(artwork, next);
      remember();
      setConfiguration(next);
      setArtwork(fitted);
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  function commit(next: Artwork) {
    if (
      JSON.stringify({ artwork: next, variableData }).length > ARTWORK_LIMIT
    ) {
      setMessage(
        "This design is full. Remove an image before duplicating or adding more.",
      );
      return false;
    }
    if (account.status === "guest") setGuestEdits((n) => n + 1);
    setMessage("");
    remember();
    setArtwork(next);
    requestKey.current = null;
    return true;
  }
  function patchLayer(patch: Partial<Layer>) {
    if (!selectedLayer) return;
    if (
      selectedLayer.locked &&
      !Object.keys(patch).every((key) =>
        ["locked", "hidden", "label"].includes(key),
      )
    )
      return;
    const next = { ...selectedLayer, ...patch };
    if (JSON.stringify(next) === JSON.stringify(selectedLayer)) return;
    const parsed = layerSchema.safeParse(next);
    if (!parsed.success) {
      setMessage(parsed.error.issues.map((issue) => issue.message).join(" "));
      return;
    }
    if (!fitsPrintArea(next, configuration)) {
      setMessage(
        "Keep the complete element, including its rotation, inside the print area.",
      );
      return;
    }
    commit({
      ...artwork,
      layers: artwork.layers.map((l) => (l.id === selected ? next : l)),
    });
  }
  function layerAction(command: LayerCommand, id = selected) {
    const next = applyLayerCommand(artwork, id, command, configuration);
    if (next && commit(next.artwork)) setSelected(next.selected);
    setEditingId(null);
  }
  function editText(id: string) {
    const layer = artwork.layers.find((l) => l.id === id);
    if (
      layer?.kind !== "text" ||
      layer.locked ||
      layer.hidden ||
      importingImage
    )
      return;
    drag.current = null;
    setSelected(id);
    setTab("edit");
    setEditingId(id);
  }
  function closeContextMenu() {
    setContextMenu(null);
    requestAnimationFrame(() => {
      if (!studioRoot.current?.querySelector(".studio-inline-text"))
        canvasElement.current?.focus();
    });
  }
  function showContextMenu(id: string, x: number, y: number) {
    setSelected(id);
    setTab("edit");
    setContextMenu({ id, x, y });
    drag.current = null;
  }
  function chooseProduct(id: ProductId) {
    if (proofOrderId) return;
    const next = {
      ...defaultConfig(id, divisions),
      quantity: configuration.quantity,
    };
    try {
      const fitted = fitArtwork(artwork, next);
      remember();
      setConfiguration(next);
      setArtwork(fitted);
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  function addText() {
    if (artwork.layers.length >= 30) return;
    const l: Layer = {
      id: crypto.randomUUID(),
      kind: "text",
      tracking: 0,
      minFontPt: 6,
      maxFontPt: 72,
      text: "YOUR WORDS HERE",
      x: 500,
      y: 500,
      width: 800,
      height: 180,
      rotation: 0,
      size: 75,
      color: "#244b37",
      font: "sans",
    };
    commit({ ...artwork, layers: [...artwork.layers, l] });
    setSelected(l.id);
    setTab("edit");
  }
  const imageContext = useRef({ artwork, configuration, variableData });
  imageContext.current = { artwork, configuration, variableData };
  async function logo(file?: File) {
    const replacement = replaceImage.current;
    replaceImage.current = null;
    if (!file || importingImage) return;
    if (!replacement && artwork.layers.length >= 30) {
      setMessage(
        "You can use up to 30 elements. Remove one before adding an image.",
      );
      return;
    }
    setImportingImage(true);
    setMessage("");
    try {
      const layers = artwork.layers.filter((l) => l.id !== replacement);
      const used = JSON.stringify({
        artwork: { ...artwork, layers },
        variableData,
      }).length;
      const imported = await importStudioImage(
        file,
        ARTWORK_LIMIT - used - 2000,
      );
      if (
        imageContext.current.artwork !== artwork ||
        imageContext.current.configuration !== configuration ||
        imageContext.current.variableData !== variableData
      )
        throw Error(
          "Your design changed while the image opened. Please add the image again.",
        );
      const previous = artwork.layers.find((l) => l.id === replacement);
      const l: Layer = fitLayer(
        {
          id: previous?.id ?? crypto.randomUUID(),
          kind: "image",
          text: file.name.slice(0, 100),
          image: imported.image,
          x: previous?.x ?? 500,
          y: previous?.y ?? 500,
          ...imageBox(
            imported.width,
            imported.height,
            configuration.width,
            configuration.height,
          ),
          rotation: previous?.rotation ?? 0,
          size: 80,
          color: "#244b37",
          font: "sans",
        },
        configuration,
      );
      commit({
        ...artwork,
        layers: previous
          ? artwork.layers.map((item) => (item.id === previous.id ? l : item))
          : [...artwork.layers, l],
      });
      setSelected(l.id);
      setTab("edit");
      setMessage(
        `Image ${previous ? "replaced" : "added"}. Drag to position or use the size controls.`,
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setImportingImage(false);
    }
  }
  async function csv(file?: File) {
    if (!file || proofOrderId) return;
    try {
      if (file.size > 250000) throw Error("CSV must be smaller than 250 KB.");
      const rows = parse(await file.text(), {
        columns: (headers: string[]) => {
          if (
            new Set(headers).size !== headers.length ||
            headers.some(
              (k) =>
                !/^[A-Za-z_][A-Za-z0-9_]{0,39}$/.test(k) ||
                ["__proto__", "prototype", "constructor"].includes(k),
            )
          )
            throw Error("Use unique column names such as number and name.");
          return headers;
        },
        skip_empty_lines: true,
        bom: true,
        trim: true,
        max_record_size: 10000,
      }) as Record<string, string>[];
      if (!rows.length || rows.length > 500)
        throw Error("CSV must have 1–500 data rows.");
      const bad = Object.keys(rows[0]).some(
        (k) =>
          !/^[A-Za-z_][A-Za-z0-9_]{0,39}$/.test(k) ||
          ["__proto__", "prototype", "constructor"].includes(k),
      );
      if (bad) throw Error("Use simple column names such as number and name.");
      if (rows.some((row) => Object.values(row).some((v) => v.length > 300)))
        throw Error("Keep each CSV value under 300 characters.");
      setVariableData(rows);
      remember();
      setConfiguration((c) => ({ ...c, quantity: rows.length }));
      setPreviewRow(0);
      requestKey.current = null;
      setMessage(
        `${rows.length} rows loaded. Use {{column_name}} in any text element.`,
      );
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  async function upload(file?: File) {
    if (!file || operation.current || !requireAccount("upload")) return;
    operation.current = true;
    setActivity("Uploading and preparing your artwork…");
    setPending(true);
    try {
      if (file.size > 20971520) throw Error("Choose artwork up to 20 MB.");
      const ext = file.name.split(".").pop()?.toLowerCase();
      const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
      if (
        ext === "png" &&
        Array.from(bytes).join(",") !== "137,80,78,71,13,10,26,10"
      )
        throw Error("Invalid PNG file.");
      if (
        ext === "pdf" &&
        new TextDecoder().decode(bytes).slice(0, 5) !== "%PDF-"
      )
        throw Error("Invalid PDF file.");
      const b = await api("/api/uploads", { name: file.name, size: file.size });
      const uploaded = await fetch(b.signedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": b.contentType,
          "Cache-Control": "max-age=3600",
        },
        body: file,
      });
      if (!uploaded.ok) throw Error("Artwork upload failed. Please try again.");
      setActivity("Preparing your file for the canvas…");
      const result = await api("/api/uploads/prepare", {
        path: b.path,
        name: file.name,
        configuration,
      });
      const imported = designSchema.parse(result.artwork);
      remember();
      setArtwork({ ...imported, name: artwork.name });
      setSelected(imported.layers[0].id);
      setUploadPath(b.path);
      setUploadName(file.name);
      setMessage(
        "Artwork ready. Your file is on the canvas and will be used for your proof.",
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      operation.current = false;
      setActivity("");
      setPending(false);
    }
  }
  async function save() {
    if (operation.current || !requireAccount("save")) return;
    operation.current = true;
    setActivity(
      proofOrderId ? "Publishing your proof…" : "Saving your design…",
    );
    setPending(true);
    try {
      designSchema.parse(artwork);
      if (proofOrderId) {
        await api("/api/orders/" + proofOrderId, {
          action: "publish_proof",
          artwork,
        });
        setMessage(
          "New proof version queued for rendering. Return to the production console to review it.",
        );
      } else {
        await persistCurrentDesign();
        setMessage("Design saved to your account.");
      }
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      operation.current = false;
      setActivity("");
      setPending(false);
    }
  }
  async function order(form: FormData) {
    if (
      operation.current ||
      !requireAccount("checkout") ||
      !quoteReady ||
      issues.length
    )
      return;
    operation.current = true;
    let navigating = false;
    setActivity("Creating your order…");
    setPending(true);
    try {
      const shipping = Object.fromEntries(form.entries());
      const fingerprint = JSON.stringify({
        configuration,
        artwork,
        variableData,
        uploadPath,
        shipping,
      });
      if (!requestKey.current || requestKey.current.fingerprint !== fingerprint)
        requestKey.current = { key: crypto.randomUUID(), fingerprint };
      await persistCurrentDesign();
      const o = await api("/api/orders", {
        designId,
        uploadName,
        requestKey: requestKey.current.key,
        configuration,
        artwork,
        variableData,
        uploadPath,
        shipping,
      });
      setActivity("Opening secure checkout…");
      const payment = await api("/api/checkout", { orderId: o.id });
      try {
        sessionStorage.setItem(CHECKOUT_RETURN_KEY, o.id);
      } catch {
        /* URL also carries the return identity. */
      }
      navigating = true;
      window.location.assign(payment.url);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      if (!navigating) {
        operation.current = false;
        setActivity("");
        setPending(false);
      }
    }
  }
  function display(text: string) {
    const row = variableData[previewRow];
    return row
      ? text.replace(/\{\{(\w+)\}\}/g, (_, key) => row[key] ?? `{{${key}}}`)
      : text;
  }
  function resizeHandle(l: Layer) {
    if (l.locked || l.hidden || editingId === l.id) return null;
    return (
      <circle
        className="resize-handle"
        cx={l.width / 2}
        cy={(l.height * configuration.height) / configuration.width / 2}
        r={Math.max(
          10,
          12000 /
            canvasFit(
              configuration.width,
              configuration.height,
              frameSize.width,
              frameSize.height,
              zoom,
            ).width,
        )}
        fill="#fffaf1"
        stroke="#2f54b8"
        strokeWidth={3}
        tabIndex={0}
        role="button"
        aria-label="Resize selected element"
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setSelected(l.id);
          setTab("edit");
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = {
            id: l.id,
            x: l.x,
            y: l.y,
            startX: e.clientX,
            startY: e.clientY,
            mode: "resize",
            before: snapshot(),
            width: l.width,
            height: l.height,
          };
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
          const delta = e.shiftKey ? 20 : 5;
          const changes: Record<string, [number, number]> = {
            ArrowRight: [delta, 0],
            ArrowLeft: [-delta, 0],
            ArrowDown: [0, delta],
            ArrowUp: [0, -delta],
          };
          if (changes[e.key]) {
            e.preventDefault();
            const [w, h] = changes[e.key];
            patchLayer({
              width: l.width + w,
              height: l.height + h,
            });
          }
        }}
      />
    );
  }
  useEffect(() => {
    const keyboard = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing =
        target.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if (!studioRoot.current?.contains(target) && target !== document.body)
        return;
      if (
        checkout ||
        reviewOpen ||
        authIntent ||
        contextMenu ||
        editingId ||
        shortcutsOpen
      )
        return;
      const shortcut = studioShortcut(e.key, {
        typing,
        modal: false,
        command: e.metaKey || e.ctrlKey,
        alt: e.altKey,
      });
      if (shortcut) {
        e.preventDefault();
        layerAction(shortcut);
        return;
      }
      if (!typing && e.key === "F2") {
        e.preventDefault();
        editText(selected);
        return;
      }
      if (!typing && e.key === "Escape") {
        setSelected("");
        return;
      }
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!pending) void save();
        return;
      }
      if (typing) return;
      if (e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [
    history,
    future,
    artwork,
    configuration,
    variableData,
    uploadPath,
    uploadName,
    designId,
    selected,
    pending,
    account.status,
    checkout,
    reviewOpen,
    authIntent,
    contextMenu,
    editingId,
    shortcutsOpen,
  ]);
  if (!hydrated)
    return account.status === "error" ? (
      <div className="workspace-error">
        <h1>Your studio couldn’t connect.</h1>
        <p>Your draft hasn’t been replaced. Try your connection again.</p>
        <button className="button" onClick={() => void account.refresh()}>
          Try again
        </button>
        <Link href="/products">Browse products</Link>
      </div>
    ) : (
      <WorkspaceSkeleton studio />
    );
  return (
    <div
      ref={studioRoot}
      onPaste={(e) => {
        const target = e.target as HTMLElement;
        if (
          target.isContentEditable ||
          ["INPUT", "TEXTAREA"].includes(target.tagName)
        )
          return;
        const file = Array.from(e.clipboardData.files).find((f) =>
          f.type.startsWith("image/"),
        );
        if (file) {
          e.preventDefault();
          replaceImage.current = null;
          void logo(file);
        }
      }}
      className={
        "moro-studio focused-studio" + (reviewOpen ? " review-open" : "")
      }
    >
      <header className="studio-appbar">
        <Link
          href={account.status === "authenticated" ? "/account" : "/products"}
          className="studio-back"
          onClick={async (e) => {
            if (
              proofOrderId ||
              account.status !== "authenticated" ||
              documentFingerprint === savedFingerprint ||
              (cloudState === "idle" &&
                documentFingerprint === initialDocument.current)
            )
              return;
            e.preventDefault();
            if (operation.current) return;
            operation.current = true;
            setPending(true);
            setActivity("Saving before opening your projects…");
            try {
              await persistCurrentDesign();
              router.push("/account");
            } catch (err) {
              setMessage((err as Error).message);
            } finally {
              operation.current = false;
              setPending(false);
              setActivity("");
            }
          }}
          aria-label={
            account.status === "authenticated"
              ? "Back to projects"
              : "Back to products"
          }
        >
          <ArrowLeft size={18} />
          <span>
            moro<span className="brand-dot">.</span>
          </span>
        </Link>
        <div className="studio-document">
          <label className="sr-only" htmlFor="studio-document-name">
            Project name
          </label>
          <input
            id="studio-document-name"
            aria-label="Project name"
            value={artwork.name}
            maxLength={100}
            onChange={(e) => commit({ ...artwork, name: e.target.value })}
          />
          <span role="status">
            {proofOrderId
              ? "Production proof"
              : account.status === "authenticated"
                ? cloudState === "error"
                  ? "Couldn’t save · use Save to retry"
                  : documentFingerprint === savedFingerprint
                    ? "All changes saved to your account"
                    : cloudState === "saving"
                      ? "Saving to your account…"
                      : "Changes save automatically"
                : draftStatus}
          </span>
        </div>
        <div className="studio-app-actions">
          {account.status === "guest" && (
            <button
              className="studio-account-cta"
              onClick={() => requireAccount("save")}
            >
              Create an account
            </button>
          )}
          <button
            className="studio-save"
            aria-label={proofOrderId ? "Publish proof" : "Save design"}
            aria-busy={pending}
            disabled={pending}
            onClick={save}
          >
            <Save size={15} />
            <span>
              {pending
                ? activity || "Working…"
                : proofOrderId
                  ? "Publish proof"
                  : "Save"}
            </span>
          </button>
          <button
            className="button"
            onClick={() => setReviewOpen((v) => !v)}
            aria-expanded={reviewOpen}
            aria-controls="studio-order-panel"
          >
            Review order <ChevronRight size={15} />
          </button>
        </div>
      </header>
      {proofOrderId && (
        <div className="wrap notice">
          Editing a production proof. Preflight the customer’s source artwork
          before publishing. Publishing creates a new version and invalidates
          any earlier approval. <Link href="/admin">Return to console</Link>
        </div>
      )}
      {message && (
        <div className="wrap notice" role="status">
          {message}
          <button
            className="notification-dismiss"
            aria-label="Dismiss studio message"
            onClick={() => setMessage("")}
          >
            <X size={14} />
          </button>
        </div>
      )}
      <div className="studio-layout">
        <nav className="studio-toolrail" aria-label="Studio tools">
          {[
            [SlidersHorizontal, "configure", "Product"],
            [Layers, "edit", "Layers"],
            [LayoutTemplate, "templates", "Layouts"],
            [FileUp, "uploads", "Uploads"],
          ].map(([Icon, id, label]) => {
            const I = Icon as typeof Type;
            return (
              <button
                key={String(id)}
                aria-pressed={tab === id}
                onClick={() => setTab(String(id))}
              >
                <I size={21} />
                <span>{String(label)}</span>
              </button>
            );
          })}
          <div className="toolrail-divider" />
          <button
            onClick={addText}
            disabled={importingImage || artwork.layers.length >= 30}
          >
            <Type size={21} />
            <span>Text</span>
          </button>
          <button
            onClick={() => {
              replaceImage.current = null;
              logoInput.current?.click();
            }}
            disabled={importingImage || artwork.layers.length >= 30}
          >
            <ImagePlus size={21} />
            <span>Images</span>
          </button>
        </nav>

        <aside className="studio-panel">
          {tab === "configure" && <h2>Product setup</h2>}
          {tab === "configure" &&
            availableTemplates.some(
              (t) => t.product_id === configuration.productId,
            ) && (
              <label>
                Start from a template
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const t = availableTemplates.find(
                      (t) => t.id === e.target.value,
                    );
                    if (t) {
                      commit(
                        fitArtwork(
                          designSchema.parse(t.artwork),
                          configuration,
                        ),
                      );
                      setSelected(t.artwork.layers[0].id);
                    }
                  }}
                >
                  <option value="">Choose a starting point</option>
                  {availableTemplates
                    .filter((t) => t.product_id === configuration.productId)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </select>
              </label>
            )}
          {tab === "uploads" ? (
            <>
              <h2>Uploads & data</h2>
              <p className="editor-caption">
                Import your finished artwork onto the canvas, add an image, or
                personalise every piece with a CSV. PDF, PDF-compatible AI,
                self-contained SVG and PNG are prepared automatically.
              </p>
              <button
                className="button outline full"
                onClick={() => {
                  replaceImage.current = null;
                  logoInput.current?.click();
                }}
              >
                <ImagePlus size={15} /> Add an image
              </button>{" "}
              <label>
                Finished artwork
                <input
                  type="file"
                  accept=".pdf,.ai,.svg,.png"
                  disabled={pending}
                  onClick={(e) => {
                    if (!requireAccount("upload")) e.preventDefault();
                  }}
                  onChange={(e) => {
                    void upload(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
              {uploadName && (
                <p className="editor-caption">
                  {artwork.source ? "Ready:" : "Attached:"} {uploadName}{" "}
                  {!artwork.source && (
                    <button
                      className="text-link"
                      disabled={pending}
                      onClick={async () => {
                        if (!uploadPath) return;
                        setPending(true);
                        setActivity("Preparing attached artwork…");
                        try {
                          const result = await api("/api/uploads/prepare", {
                            path: uploadPath,
                            name: uploadName,
                            configuration,
                          });
                          const imported = designSchema.parse(result.artwork);
                          remember();
                          setArtwork({ ...imported, name: artwork.name });
                          setSelected(imported.layers[0].id);
                          setMessage(
                            "Your source artwork is ready on the canvas.",
                          );
                        } catch (e) {
                          setMessage((e as Error).message);
                        } finally {
                          setPending(false);
                          setActivity("");
                        }
                      }}
                    >
                      Prepare artwork
                    </button>
                  )}
                  <button
                    className="text-link"
                    onClick={() => {
                      remember();
                      setUploadPath(undefined);
                      setUploadName("");
                      setArtwork(({ source: _source, ...current }) => current);
                    }}
                  >
                    Remove
                  </button>
                </p>
              )}
              <a
                className="text-link"
                href="/examples/personalisation.csv"
                download
              >
                Download a CSV example ↗
              </a>
              <label>
                Variable data (CSV)
                <input
                  type="file"
                  disabled={!!proofOrderId}
                  accept=".csv"
                  onChange={(e) => csv(e.target.files?.[0])}
                />
              </label>
              {variableData.length > 0 && (
                <>
                  <label>
                    Preview row
                    <select
                      value={previewRow}
                      onChange={(e) => setPreviewRow(Number(e.target.value))}
                    >
                      {variableData.map((_, i) => (
                        <option key={i} value={i}>
                          Row {i + 1}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="text-link"
                    onClick={() => {
                      setVariableData([]);
                      setPreviewRow(0);
                    }}
                  >
                    Remove CSV data
                  </button>
                  <pre className="csv-preview">
                    {JSON.stringify(variableData[previewRow], null, 2)}
                  </pre>
                </>
              )}
            </>
          ) : tab === "templates" ? (
            <>
              <h2>Starting points</h2>
              <p className="editor-caption">
                Choose a layout for {p.name.toLowerCase()}, then make it yours.
              </p>
              {availableTemplates
                .filter((t) => t.product_id === configuration.productId)
                .map((t) => (
                  <button
                    className="template-preview"
                    key={t.id}
                    onClick={() => {
                      commit(
                        fitArtwork(
                          designSchema.parse(t.artwork),
                          configuration,
                        ),
                      );
                      setSelected(t.artwork.layers[0]?.id || "");
                      setTab("edit");
                    }}
                  >
                    <ArtworkThumbnail
                      artwork={t.artwork}
                      configuration={configuration}
                    />
                    <span>{t.name}</span>
                  </button>
                ))}
              {!availableTemplates.some(
                (t) => t.product_id === configuration.productId,
              ) && (
                <div className="studio-starting-point">
                  <ArtworkThumbnail
                    artwork={initialArtwork(configuration.productId)}
                    configuration={configuration}
                  />
                  <button
                    className="button outline full"
                    onClick={() => {
                      commit(
                        fitArtwork(
                          initialArtwork(configuration.productId),
                          configuration,
                        ),
                      );
                      setSelected(initialArtwork().layers[0].id);
                      setTab("edit");
                    }}
                  >
                    Use the studio layout
                  </button>
                  <p className="editor-caption">
                    Or add your own text and logo to start from scratch.
                  </p>
                </div>
              )}
            </>
          ) : tab === "configure" ? (
            <>
              <label>
                What are we making?
                <select
                  disabled={!!proofOrderId}
                  value={configuration.productId}
                  onChange={(e) => chooseProduct(e.target.value as ProductId)}
                >
                  {divisions.map((p) => (
                    <option value={p.id} key={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="field-row">
                <label>
                  Width (mm)
                  <NumberField
                    min={10}
                    max={300}
                    disabled={!!proofOrderId}
                    value={configuration.width}
                    onChange={(e) =>
                      configure({
                        ...configuration,
                        width: Math.max(
                          10,
                          Math.min(300, Number(e.target.value) || 10),
                        ),
                      })
                    }
                  />
                </label>
                <label>
                  Height (mm)
                  <NumberField
                    min={10}
                    max={300}
                    disabled={!!proofOrderId}
                    value={configuration.height}
                    onChange={(e) =>
                      configure({
                        ...configuration,
                        height: Math.max(
                          10,
                          Math.min(300, Number(e.target.value) || 10),
                        ),
                      })
                    }
                  />
                </label>
              </div>
              <div
                className="orientation-controls"
                aria-label="Print orientation"
              >
                <button
                  disabled={!!proofOrderId}
                  aria-pressed={configuration.width < configuration.height}
                  onClick={() =>
                    configure({
                      ...configuration,
                      width: Math.min(
                        configuration.width,
                        configuration.height,
                      ),
                      height: Math.max(
                        configuration.width,
                        configuration.height,
                      ),
                    })
                  }
                >
                  Portrait
                </button>
                <button
                  disabled={!!proofOrderId}
                  aria-pressed={configuration.width > configuration.height}
                  onClick={() =>
                    configure({
                      ...configuration,
                      width: Math.max(
                        configuration.width,
                        configuration.height,
                      ),
                      height: Math.min(
                        configuration.width,
                        configuration.height,
                      ),
                    })
                  }
                >
                  Landscape
                </button>
                <button
                  disabled={!!proofOrderId}
                  aria-pressed={configuration.width === configuration.height}
                  onClick={() =>
                    configure({ ...configuration, height: configuration.width })
                  }
                >
                  Square
                </button>
              </div>
              <label>
                Material
                <select
                  disabled={!!proofOrderId}
                  value={configuration.material}
                  onChange={(e) =>
                    configure({
                      ...configuration,
                      material: e.target.value,
                    })
                  }
                >
                  {p.material.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </label>
              <label>
                Quantity
                <NumberField
                  min={1}
                  max={500}
                  disabled={!!proofOrderId}
                  value={configuration.quantity}
                  onChange={(e) =>
                    configure({
                      ...configuration,
                      quantity: Math.max(
                        1,
                        Math.min(500, Math.round(Number(e.target.value) || 1)),
                      ),
                    })
                  }
                />
              </label>
              <p className="editor-caption">
                Print sizes from 10–300 mm. Volume savings are applied
                automatically.
              </p>
              <label>
                Background
                <input
                  type="color"
                  value={artwork.background}
                  onChange={(e) =>
                    commit({ ...artwork, background: e.target.value })
                  }
                />
              </label>
              <button className="text-link" onClick={() => setTab("uploads")}>
                Add source artwork or CSV data <ChevronRight size={14} />
              </button>
            </>
          ) : (
            <>
              <h2>Your layers</h2>
              <div className="layer-list">
                {[...artwork.layers].reverse().map((l) => (
                  <div
                    key={l.id}
                    className={
                      "studio-layer-row" +
                      (selected === l.id ? " selected" : "") +
                      (l.hidden ? " is-hidden" : "")
                    }
                    draggable={!l.locked}
                    onDragStart={(e) => {
                      draggedLayer.current = l.id;
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", l.id);
                    }}
                    onDragEnd={() => {
                      draggedLayer.current = null;
                    }}
                    onDragOver={(e) => {
                      if (draggedLayer.current) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                      }
                    }}
                    onDrop={(e) => {
                      if (!draggedLayer.current) return;
                      e.preventDefault();
                      const next = moveLayerTo(
                        artwork,
                        draggedLayer.current,
                        l.id,
                      );
                      if (next) commit(next);
                      draggedLayer.current = null;
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      showContextMenu(l.id, e.clientX, e.clientY);
                    }}
                  >
                    <button
                      className="studio-layer-select"
                      aria-pressed={selected === l.id}
                      onClick={() => setSelected(l.id)}
                      onDoubleClick={() => editText(l.id)}
                      onKeyDown={(e) => {
                        if (
                          e.altKey &&
                          ["ArrowUp", "ArrowDown"].includes(e.key)
                        ) {
                          e.preventDefault();
                          layerAction(
                            e.key === "ArrowUp" ? "forward" : "backward",
                            l.id,
                          );
                          return;
                        }

                        if (e.key === "F10" && e.shiftKey) {
                          e.preventDefault();
                          const r = e.currentTarget.getBoundingClientRect();
                          showContextMenu(l.id, r.left, r.bottom);
                        }
                      }}
                    >
                      <GripVertical size={12} aria-hidden="true" />
                      <span>
                        {l.kind === "image" ? (
                          <ImagePlus size={14} />
                        ) : (
                          <Type size={14} />
                        )}
                      </span>
                      <span>
                        {l.label ||
                          l.text ||
                          (l.kind === "image" ? "Image" : "Empty text")}
                      </span>
                    </button>
                    <button
                      aria-label={`${l.hidden ? "Show" : "Hide"} ${l.label || l.text || "layer"}`}
                      aria-pressed={!!l.hidden}
                      onClick={() => layerAction("visibility", l.id)}
                    >
                      {l.hidden ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <button
                      aria-label={`${l.locked ? "Unlock" : "Lock"} ${l.label || l.text || "layer"}`}
                      aria-pressed={!!l.locked}
                      onClick={() => layerAction("lock", l.id)}
                    >
                      {l.locked ? (
                        <LockKeyhole size={13} />
                      ) : (
                        <LockOpen size={13} />
                      )}
                    </button>
                  </div>
                ))}
              </div>
              {!artwork.layers.length && (
                <p className="editor-caption">
                  A fresh canvas. Add text, an image or choose a layout to
                  begin.
                </p>
              )}
              {selectedLayer && (
                <>
                  <label>
                    Layer name
                    <input
                      value={selectedLayer.label ?? ""}
                      maxLength={100}
                      placeholder={
                        selectedLayer.kind === "text"
                          ? "Text element"
                          : "Image element"
                      }
                      onChange={(e) => patchLayer({ label: e.target.value })}
                    />
                  </label>
                  {selectedLayer.locked && (
                    <p className="editor-caption">
                      This layer is locked. Unlock it to change or move it.
                    </p>
                  )}
                  <div className="layer-quick-actions">
                    <button onClick={() => layerAction("lock")}>
                      {selectedLayer.locked ? "Unlock layer" : "Lock layer"}
                    </button>
                    <button onClick={() => layerAction("visibility")}>
                      {selectedLayer.hidden ? "Show layer" : "Hide layer"}
                    </button>
                  </div>
                  <fieldset
                    className="studio-layer-properties"
                    disabled={!!selectedLayer.locked}
                  >
                    {selectedLayer.kind === "image" && (
                      <div className="image-inspector">
                        <img
                          src={selectedLayer.image}
                          alt={selectedLayer.text || "Selected image"}
                        />
                        <p>{selectedLayer.text || "Image"}</p>
                        <button
                          className="button outline full"
                          disabled={importingImage}
                          onClick={() => {
                            replaceImage.current = selectedLayer.id;
                            logoInput.current?.click();
                          }}
                        >
                          <ImagePlus size={15} /> Replace image
                        </button>
                        <p className="editor-caption">
                          PNG, JPEG or WebP · up to 5 MB. Transparent artwork
                          stays transparent.
                        </p>
                      </div>
                    )}
                    {selectedLayer.kind === "text" && (
                      <>
                        <label>
                          Text
                          <textarea
                            value={selectedLayer.text}
                            maxLength={300}
                            onChange={(e) =>
                              patchLayer({ text: e.target.value })
                            }
                          />
                        </label>
                        <label>
                          Typeface
                          <select
                            value={selectedLayer.font}
                            onChange={(e) =>
                              patchLayer({
                                font: e.target.value as Layer["font"],
                              })
                            }
                          >
                            <option value="sans">Studio Sans</option>
                            <option value="serif">Classic Serif</option>
                            <option value="mono">Utility Mono</option>
                          </select>
                        </label>
                        <div className="field-row">
                          <label>
                            Text size
                            <NumberField
                              min={12}
                              max={240}
                              value={selectedLayer.size}
                              onChange={(e) =>
                                patchLayer({
                                  size: Math.max(
                                    12,
                                    Math.min(240, Number(e.target.value) || 12),
                                  ),
                                })
                              }
                            />
                          </label>
                          <label>
                            Text colour
                            <input
                              type="color"
                              value={selectedLayer.color}
                              onChange={(e) =>
                                patchLayer({ color: e.target.value })
                              }
                            />
                          </label>
                        </div>
                      </>
                    )}
                    {selectedLayer.kind === "text" && (
                      <details className="layer-position">
                        <summary>Text fitting & spacing</summary>
                        <p className="editor-caption">
                          Shrink text to fit this element. Limits are in printed
                          points; tracking uses 1/1000 em.
                        </p>
                        <div className="field-row">
                          <label>
                            Minimum (pt)
                            <NumberField
                              min={6}
                              max={144}
                              value={selectedLayer.minFontPt ?? 6}
                              onChange={(e) =>
                                patchLayer({
                                  minFontPt: Number(e.target.value),
                                })
                              }
                            />
                          </label>
                          <label>
                            Maximum (pt)
                            <NumberField
                              min={6}
                              max={144}
                              value={selectedLayer.maxFontPt ?? 72}
                              onChange={(e) =>
                                patchLayer({
                                  maxFontPt: Number(e.target.value),
                                })
                              }
                            />
                          </label>
                        </div>
                        <label>
                          Letter spacing
                          <NumberField
                            min={-100}
                            max={400}
                            value={selectedLayer.tracking ?? 0}
                            onChange={(e) =>
                              patchLayer({ tracking: Number(e.target.value) })
                            }
                          />
                        </label>
                      </details>
                    )}
                    <details className="layer-position">
                      <summary>Position, size & rotation</summary>
                      <div className="field-row">
                        <label>
                          Box width
                          <NumberField
                            min={20}
                            max={1000}
                            value={selectedLayer.width}
                            onChange={(e) =>
                              patchLayer({ width: Number(e.target.value) })
                            }
                          />
                        </label>
                        <label>
                          Box height
                          <NumberField
                            min={20}
                            max={1000}
                            value={selectedLayer.height}
                            onChange={(e) =>
                              patchLayer({ height: Number(e.target.value) })
                            }
                          />
                        </label>
                      </div>
                      <div className="field-row">
                        <label>
                          X position
                          <NumberField
                            value={selectedLayer.x}
                            onChange={(e) =>
                              patchLayer({ x: Number(e.target.value) })
                            }
                          />
                        </label>
                        <label>
                          Y position
                          <NumberField
                            value={selectedLayer.y}
                            onChange={(e) =>
                              patchLayer({ y: Number(e.target.value) })
                            }
                          />
                        </label>
                      </div>
                      <label>
                        Rotation
                        <input
                          type="range"
                          min={-180}
                          max={180}
                          value={selectedLayer.rotation}
                          onChange={(e) =>
                            patchLayer({ rotation: Number(e.target.value) })
                          }
                        />
                      </label>
                    </details>
                    <div className="layer-quick-actions">
                      <button onClick={() => patchLayer({ x: 500 })}>
                        Centre horizontally
                      </button>
                      <button onClick={() => patchLayer({ y: 500 })}>
                        Centre vertically
                      </button>
                    </div>
                    <div className="layer-quick-actions">
                      <button
                        disabled={importingImage || artwork.layers.length >= 30}
                        onClick={() => layerAction("duplicate")}
                      >
                        <Copy size={14} />
                        Duplicate
                      </button>
                      <button
                        disabled={artwork.layers.at(-1)?.id === selected}
                        onClick={() => layerAction("forward")}
                      >
                        <ArrowUp size={14} />
                        Forward
                      </button>
                      <button
                        disabled={artwork.layers[0]?.id === selected}
                        onClick={() => layerAction("backward")}
                      >
                        <ArrowDown size={14} />
                        Backward
                      </button>
                      <button
                        disabled={artwork.layers.at(-1)?.id === selected}
                        onClick={() => layerAction("front")}
                      >
                        To front
                      </button>
                      <button
                        disabled={artwork.layers[0]?.id === selected}
                        onClick={() => layerAction("back")}
                      >
                        To back
                      </button>
                    </div>
                    <button
                      className="text-link danger"
                      onClick={() => layerAction("delete")}
                    >
                      <Trash2 size={14} />
                      Delete layer
                    </button>
                  </fieldset>
                  <p className="editor-caption">
                    Drag to position. Rotated corners stay inside the printable
                    area. Final font fitting is checked on your server-generated
                    proof.
                  </p>
                </>
              )}
            </>
          )}
        </aside>
        <section
          className="studio-workspace"
          aria-busy={importingImage}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes("Files")) e.preventDefault();
          }}
          onDrop={(e) => {
            if (!e.dataTransfer.files.length) return;
            e.preventDefault();
            replaceImage.current = null;
            void logo(e.dataTransfer.files[0]);
          }}
        >
          {importingImage && (
            <div className="studio-import-status" role="status">
              Preparing your image…
            </div>
          )}
          <div className="workspace-toolbar">
            <button
              onClick={() => setShortcutsOpen(true)}
              aria-label="Keyboard shortcuts"
              title="Keyboard shortcuts"
            >
              ⌨
            </button>
            <button
              onClick={addText}
              disabled={importingImage || artwork.layers.length >= 30}
            >
              <Type size={15} />
              Add text
            </button>
            <button
              disabled={importingImage || artwork.layers.length >= 30}
              onClick={() => {
                replaceImage.current = null;
                logoInput.current?.click();
              }}
            >
              <ImagePlus size={15} />
              {importingImage ? "Opening image…" : "Add image"}
            </button>
            <input
              ref={logoInput}
              aria-label="Choose an image"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                void logo(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <button disabled={!history.length} onClick={undo}>
              <Undo2 size={15} />
              Undo
            </button>
            <button disabled={!future.length} onClick={redo}>
              <Redo2 size={15} />
              Redo
            </button>
            {isAdmin && (
              <button
                disabled={pending}
                onClick={async () => {
                  setPending(true);
                  try {
                    await api("/api/templates", {
                      productId: configuration.productId,
                      name: artwork.name,
                      artwork,
                    });
                    setMessage("Shared template saved.");
                  } catch (e) {
                    setMessage((e as Error).message);
                  } finally {
                    setPending(false);
                  }
                }}
              >
                Publish layout
              </button>
            )}
          </div>
          <label className="studio-zoom">
            Preview size
            <select
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            >
              <option value={75}>75%</option>
              <option value={100}>Fit</option>
              <option value={125}>125%</option>
            </select>
          </label>
          <div className="canvas-frame" ref={frame}>
            <div
              ref={board}
              className="artboard"
              style={{
                aspectRatio: `${configuration.width}/${configuration.height}`,
                width: canvasFit(
                  configuration.width,
                  configuration.height,
                  frameSize.width,
                  frameSize.height,
                  zoom,
                ).width,
                maxWidth: "none",
                maxHeight: "none",
                flexShrink: 0,
                background: artwork.background,
              }}
              onPointerMove={(e) => {
                if (!drag.current || !board.current) return;
                const rect = board.current.getBoundingClientRect();
                const d = drag.current;
                const l = artwork.layers.find((l) => l.id === d.id)!;
                const dx = ((e.clientX - d.startX) / rect.width) * 1000,
                  dy = ((e.clientY - d.startY) / rect.height) * 1000;
                const ratio = configuration.height / configuration.width,
                  r = (l.rotation * Math.PI) / 180;
                const localX = dx * Math.cos(r) + dy * ratio * Math.sin(r),
                  localY = (-dx * Math.sin(r)) / ratio + dy * Math.cos(r);
                const next =
                  d.mode === "resize"
                    ? {
                        ...l,
                        width: Math.max(
                          20,
                          Math.min(1000, d.width! + localX * 2),
                        ),
                        height: Math.max(
                          20,
                          Math.min(1000, d.height! + localY * 2),
                        ),
                      }
                    : {
                        ...l,
                        x: Math.round(d.x + dx),
                        y: Math.round(d.y + dy),
                      };
                if (
                  layerSchema.safeParse(next).success &&
                  fitsPrintArea(next, configuration) &&
                  (next.x !== l.x ||
                    next.y !== l.y ||
                    next.width !== l.width ||
                    next.height !== l.height)
                ) {
                  if (!d.recorded) {
                    setHistory((h) => [...h.slice(-39), d.before!]);
                    setFuture([]);
                    d.recorded = true;
                  }
                  setArtwork((a) => ({
                    ...a,
                    layers: a.layers.map((l) => (l.id === d.id ? next : l)),
                  }));
                }
              }}
              onPointerUp={() => {
                drag.current = null;
                requestKey.current = null;
              }}
              onPointerCancel={() => {
                drag.current = null;
              }}
            >
              <svg
                ref={canvasElement}
                tabIndex={0}
                onPointerDown={(e) => {
                  if (e.target === e.currentTarget) {
                    setSelected("");
                    e.currentTarget.focus();
                  }
                }}
                viewBox={`0 0 1000 ${(1000 * configuration.height) / configuration.width}`}
                preserveAspectRatio="xMidYMid meet"
                aria-label="Editable artwork preview"
              >
                {artwork.layers
                  .filter((l) => !l.hidden)
                  .map((l) => (
                    <g
                      key={l.id}
                      transform={`translate(${l.x} ${(l.y * configuration.height) / configuration.width}) rotate(${l.rotation})`}
                      onDoubleClick={() => editText(l.id)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        showContextMenu(l.id, e.clientX, e.clientY);
                      }}
                      onPointerDown={(e) => {
                        if (e.button !== 0 || editingId) return;
                        e.preventDefault();
                        e.currentTarget.focus();
                        setSelected(l.id);
                        setTab("edit");
                        if (l.locked) return;
                        e.currentTarget.setPointerCapture(e.pointerId);
                        drag.current = {
                          id: l.id,
                          x: l.x,
                          y: l.y,
                          before: snapshot(),
                          startX: e.clientX,
                          startY: e.clientY,
                        };
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={
                        "Select " +
                        (l.text ||
                          (l.kind === "image" ? "image" : "text element"))
                      }
                      aria-pressed={selected === l.id}
                      onFocus={() => {
                        setSelected(l.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "F10" && e.shiftKey) {
                          e.preventDefault();
                          const r = e.currentTarget.getBoundingClientRect();
                          showContextMenu(l.id, r.left, r.bottom);
                          return;
                        }
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelected(l.id);
                          setTab("edit");
                          if (e.key === "Enter") editText(l.id);
                        }
                        if (l.locked) return;
                        const delta = e.shiftKey ? 20 : 5;
                        const shift: Record<string, [number, number]> = {
                          ArrowLeft: [-delta, 0],
                          ArrowRight: [delta, 0],
                          ArrowUp: [0, -delta],
                          ArrowDown: [0, delta],
                        };
                        if (shift[e.key]) {
                          e.preventDefault();
                          const [x, y] = shift[e.key];
                          const next = { ...l, x: l.x + x, y: l.y + y };
                          if (
                            layerSchema.safeParse(next).success &&
                            fitsPrintArea(next, configuration)
                          )
                            commit({
                              ...artwork,
                              layers: artwork.layers.map((layer) =>
                                layer.id === l.id ? next : layer,
                              ),
                            });
                        }
                      }}
                      style={{
                        cursor: l.locked ? "default" : "move",
                        opacity: editingId === l.id ? 0 : 1,
                      }}
                    >
                      {l.id === selected && (
                        <rect
                          x={-l.width / 2}
                          y={
                            ((-l.height / 2) * configuration.height) /
                            configuration.width
                          }
                          width={l.width}
                          height={
                            (l.height * configuration.height) /
                            configuration.width
                          }
                          fill="transparent"
                          stroke="#497649"
                          strokeWidth="2"
                          strokeDasharray="8 6"
                        />
                      )}

                      {l.kind === "image" ? (
                        <image
                          href={l.image}
                          x={-l.width / 2}
                          y={
                            ((-l.height / 2) * configuration.height) /
                            configuration.width
                          }
                          width={l.width}
                          height={
                            (l.height * configuration.height) /
                            configuration.width
                          }
                          preserveAspectRatio="xMidYMid meet"
                        />
                      ) : (
                        <text
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontFamily={printFontFamily[l.font]}
                          fontWeight="700"
                          letterSpacing={
                            layerTextGeometry(display(l.text), l, configuration)
                              .tracking
                          }
                          fontSize={
                            layerTextGeometry(display(l.text), l, configuration)
                              .size
                          }
                          fill={l.color}
                          textLength={
                            layerTextGeometry(display(l.text), l, configuration)
                              .width
                          }
                          lengthAdjust="spacingAndGlyphs"
                        >
                          {display(l.text)}
                        </text>
                      )}
                    </g>
                  ))}
                {selectedLayer && (
                  <g
                    transform={`translate(${selectedLayer.x} ${(selectedLayer.y * configuration.height) / configuration.width}) rotate(${selectedLayer.rotation})`}
                  >
                    {resizeHandle(selectedLayer)}
                  </g>
                )}
              </svg>
              {editingId && artwork.layers.find((l) => l.id === editingId) && (
                <InlineTextEditor
                  key={editingId}
                  layer={artwork.layers.find((l) => l.id === editingId)!}
                  onCancel={() => {
                    setEditingId(null);
                    canvasElement.current?.focus();
                  }}
                  onCommit={(text) => {
                    const layer = artwork.layers.find(
                      (l) => l.id === editingId,
                    );
                    if (layer && !layer.locked && text !== layer.text)
                      commit({
                        ...artwork,
                        layers: artwork.layers.map((l) =>
                          l.id === editingId ? { ...l, text } : l,
                        ),
                      });
                    setEditingId(null);
                    canvasElement.current?.focus();
                  }}
                />
              )}

              <div className="print-boundary" />
            </div>
          </div>
          <div className="canvas-note">
            <LockKeyhole size={12} />
            {configuration.width} × {configuration.height} MM ·{" "}
            {p.printProfile?.bleedMm ?? 3} MM BLEED · TRIM AREA · BLEED ADDED TO
            PROOF
          </div>
          <p className="editor-caption">
            Select an element to edit. Drag to move, or use arrow keys when
            focused.
          </p>
        </section>
        {reviewOpen && (
          <Dialog
            label="studio-order-title"
            className="order-drawer"
            onClose={() => setReviewOpen(false)}
          >
            <aside
              className="studio-summary"
              id="studio-order-panel"
              aria-label="Order details"
            >
              <div className="order-panel-heading">
                <h2 id="studio-order-title">Your print order</h2>
                <button
                  className="icon-button"
                  aria-label="Close order details"
                  onClick={() => setReviewOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="summary-main">
                <div className="summary-title">
                  <ShieldCheck size={22} />
                  <div>
                    <h2 style={{ margin: 0 }}>Your print, your way.</h2>
                    <span>{p.name}</span>
                  </div>
                </div>
                <div className="price-total" aria-live="polite">
                  {quoteReady ? money(quote.total, quote.currency) : "—"}
                </div>
                <p className="editor-caption">
                  {money(quote.unit, quote.currency)} per piece before GST
                </p>
                <div className="price-lines">
                  <div>
                    <span>{configuration.quantity} pieces</span>
                    <span>{money(quote.goods, quote.currency)}</span>
                  </div>
                  <div>
                    <span>Setup & preparation</span>
                    <span>{money(quote.setup, quote.currency)}</span>
                  </div>
                  <div>
                    <span>GST ({quote.taxBps / 100}%)</span>
                    <span>{money(quote.tax, quote.currency)}</span>
                  </div>
                  <div className="grand">
                    <span>Your total</span>
                    <span>{money(quote.total, quote.currency)}</span>
                  </div>
                </div>
                {quote.discountBps > 0 && (
                  <div className="discount">
                    <Check size={14} /> {quote.discountBps / 100}% volume
                    savings applied
                  </div>
                )}
              </div>
              <div>
                <button
                  className="button full"
                  disabled={
                    !hydrated ||
                    pending ||
                    !quoteReady ||
                    issues.length > 0 ||
                    account.status === "loading"
                  }
                  onClick={() => {
                    setMessage("");
                    if (requireAccount("checkout")) {
                      setReviewOpen(false);
                      setCheckout(true);
                    }
                  }}
                >
                  Review & continue
                </button>
                <p className="editor-caption" role="status">
                  {quoteError ||
                    (!quoteReady
                      ? "Updating your price…"
                      : "Price includes GST. Review delivery details next.")}
                </p>
                {issues.length > 0 && (
                  <ul
                    className="studio-checks"
                    aria-label="Before you continue"
                  >
                    {issues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                )}
                {account.status === "guest" && (
                  <button
                    className="text-link"
                    onClick={() => requireAccount("save")}
                  >
                    Sign in to save your project
                  </button>
                )}
                <div className="summary-help">
                  <ShieldCheck size={18} />
                  <span>
                    Nothing goes to print until you approve your proof. Every
                    revision is recorded.
                  </span>
                </div>
                <p className="notice">
                  {quote.sandbox
                    ? "Preview pricing includes sample GST. Your artwork proof comes next."
                    : quote.approved
                      ? "Delivery included within the configured service area."
                      : "Sample rates and 18% GST for preview. Final product taxes, delivery terms and prices require merchant approval before ordering opens."}
                </p>
              </div>
            </aside>
          </Dialog>
        )}
      </div>
      <footer className="studio-statusbar">
        <span>
          {p.short} · {configuration.width} × {configuration.height} mm ·{" "}
          {configuration.quantity} pieces
        </span>
        <span>
          {quoteReady
            ? money(quote.total, quote.currency) + " incl. GST"
            : "Updating price…"}{" "}
          · Proof approval before print
        </span>
      </footer>
      {account.status === "guest" &&
        guestEdits >= 3 &&
        !nudgeDismissed &&
        !authIntent && (
          <aside className="guest-save-nudge" aria-label="Save your progress">
            <span className="nudge-symbol">
              <Save size={18} />
            </span>
            <div>
              <strong>This idea’s worth keeping.</strong>
              <p>Create an account to save projects and order your prints.</p>
            </div>
            <button onClick={() => requireAccount("save")}>
              Create account <ChevronRight size={14} />
            </button>
            <button
              className="icon-button"
              aria-label="Dismiss account reminder"
              onClick={() => {
                setNudgeDismissed(true);
                try {
                  sessionStorage.setItem("moro-studio-nudge-dismissed", "yes");
                } catch {}
              }}
            >
              <X size={15} />
            </button>
          </aside>
        )}
      {checkout && (
        <Dialog
          label="checkout-title"
          onClose={() => {
            if (!pending) setCheckout(false);
          }}
        >
          <div className="modal-heading">
            <h2 id="checkout-title">The final details.</h2>
            <button
              className="icon-button"
              aria-label="Close checkout"
              disabled={pending}
              onClick={() => setCheckout(false)}
            >
              <X size={18} />
            </button>
          </div>
          <p>
            {configuration.quantity} {p.short.toLowerCase()} ·{" "}
            {configuration.width} × {configuration.height} mm ·{" "}
            {money(quote.total, quote.currency)}
          </p>
          <p className="editor-caption">
            India delivery address. Your payment is confirmed securely by
            Stripe. The next step is your artwork proof.
          </p>
          <form action={order}>
            <div className="field-row">
              <label>
                Full name
                <input name="name" required minLength={2} autoComplete="name" />
              </label>
              <label>
                Email
                <input
                  name="email"
                  required
                  type="email"
                  autoComplete="email"
                />
              </label>
            </div>
            <div className="field-row">
              <label>
                Phone
                <input name="phone" required type="tel" autoComplete="tel" />
              </label>
              <label>
                GSTIN (optional)
                <input
                  name="gstin"
                  maxLength={15}
                  placeholder="Business purchases"
                />
              </label>
            </div>
            <label>
              Address
              <input
                name="line1"
                required
                minLength={5}
                autoComplete="street-address"
              />
            </label>
            <div className="field-row">
              <label>
                City
                <input name="city" required autoComplete="address-level2" />
              </label>
              <label>
                State
                <input name="state" required autoComplete="address-level1" />
              </label>
            </div>
            <label>
              PIN code
              <input
                name="pincode"
                required
                pattern="[1-9][0-9]{5}"
                autoComplete="postal-code"
              />
            </label>
            <TestPaymentGuide enabled={quote.sandbox} />
            <button
              className="button full"
              disabled={pending}
              aria-busy={pending}
            >
              {pending
                ? activity || "Preparing your order…"
                : `Continue to payment · ${money(quote.total, quote.currency)}`}
            </button>
            <p role="status" className="form-message">
              {message}
            </p>
          </form>
        </Dialog>
      )}
      {authIntent && (
        <Dialog label="studio-auth-title" onClose={() => setAuthIntent(null)}>
          <div className="modal-heading">
            <h2 id="studio-auth-title">Keep your idea going.</h2>
            <button
              className="icon-button"
              aria-label="Close sign-in prompt"
              onClick={() => setAuthIntent(null)}
            >
              <X size={18} />
            </button>
          </div>
          <p>
            {authIntent === "checkout"
              ? "Sign in to keep your order, payment and artwork proofs together."
              : authIntent === "upload"
                ? "Sign in to attach source artwork securely to your project. Choose your file again when you return."
                : "Sign in to save this project to your account and return to it from any device."}
          </p>
          <p className="editor-caption">
            Your draft stays in this browser tab while you sign in. We’ll bring
            you back here.
          </p>
          <Link
            className="button full"
            href={
              "/auth?next=" +
              encodeURIComponent(
                "/studio?product=" +
                  configuration.productId +
                  "&intent=" +
                  authIntent,
              )
            }
            onClick={() => keepDraft()}
          >
            Sign in or create an account
          </Link>
          <button className="text-link" onClick={() => setAuthIntent(null)}>
            Keep exploring
          </button>
        </Dialog>
      )}
      {contextMenu &&
        (() => {
          const l = artwork.layers.find((l) => l.id === contextMenu.id);
          if (!l) return null;
          return (
            <StudioContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              onClose={closeContextMenu}
              actions={[
                {
                  label: "Edit text",
                  shortcut: "Enter",
                  disabled: l.kind !== "text" || l.locked || l.hidden,
                  run: () => editText(l.id),
                },
                {
                  label: "Duplicate",
                  shortcut: "⌘ / Ctrl D",
                  disabled: l.locked || artwork.layers.length >= 30,
                  run: () => layerAction("duplicate", l.id),
                },
                {
                  label: "Bring forward",
                  disabled: l.locked || artwork.layers.at(-1)?.id === l.id,
                  run: () => layerAction("forward", l.id),
                },
                {
                  label: "Send backward",
                  disabled: l.locked || artwork.layers[0]?.id === l.id,
                  run: () => layerAction("backward", l.id),
                },
                {
                  label: l.locked ? "Unlock layer" : "Lock layer",
                  run: () => layerAction("lock", l.id),
                },
                {
                  label: l.hidden ? "Show layer" : "Hide layer",
                  run: () => layerAction("visibility", l.id),
                },
                {
                  label: "Delete",
                  shortcut: "Delete",
                  disabled: l.locked,
                  run: () => layerAction("delete", l.id),
                },
              ]}
            />
          );
        })()}
      {shortcutsOpen && (
        <Dialog
          label="studio-shortcuts-title"
          onClose={() => setShortcutsOpen(false)}
        >
          <div className="modal-title-row">
            <h2 id="studio-shortcuts-title">Make yourself at home.</h2>
            <button
              aria-label="Close keyboard shortcuts"
              onClick={() => setShortcutsOpen(false)}
            >
              <X size={20} />
            </button>
          </div>
          <p>
            Shortcuts apply to the selected element. Typing inside a field edits
            that field.
          </p>
          <dl className="studio-shortcuts">
            <dt>Delete / Backspace</dt>
            <dd>Delete the selected unlocked element</dd>
            <dt>Double-click / Enter / F2</dt>
            <dd>Edit text directly on the canvas</dd>
            <dt>⌘ / Ctrl D</dt>
            <dd>Duplicate an element</dd>
            <dt>⌘ / Ctrl Z</dt>
            <dd>Undo · add Shift to redo</dd>
            <dt>⌘ / Ctrl S</dt>
            <dd>Save your design</dd>
            <dt>Arrow keys</dt>
            <dd>Move · hold Shift for a bigger step</dd>
            <dt>Right-click / Shift F10</dt>
            <dd>Open element actions</dd>
            <dt>Alt ↑ / ↓ in Layers</dt>
            <dd>Change stacking order</dd>
            <dt>Escape</dt>
            <dd>Cancel inline editing or clear selection</dd>
          </dl>
        </Dialog>
      )}
    </div>
  );
}
