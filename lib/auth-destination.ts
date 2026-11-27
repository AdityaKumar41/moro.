const intents = new Set(["save", "checkout", "upload"]);
export function authDestination(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length > 500 ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\r\n]/.test(value)
  )
    return "/account";
  try {
    const url = new URL(value, "https://moro.invalid");
    if (url.origin !== "https://moro.invalid") return "/account";
    if (["/account", "/admin", "/auth/reset"].includes(url.pathname))
      return url.pathname;
    if (url.pathname !== "/studio") return "/account";
    const query = new URLSearchParams();
    const product = url.searchParams.get("product");
    if (product && /^[a-z][a-z0-9-]{1,39}$/.test(product))
      query.set("product", product);
    const intent = url.searchParams.get("intent");
    if (intent && intents.has(intent)) query.set("intent", intent);
    return "/studio" + (query.size ? "?" + query.toString() : "");
  } catch {
    return "/account";
  }
}
