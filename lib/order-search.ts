import { z } from "zod";
import { stages } from "./catalog";
export function orderSearch(params: URLSearchParams) {
  const status = params.get("status") || "all",
    family = params.get("family") || "all",
    day = params.get("date") || "",
    query = z
      .string()
      .max(100)
      .parse(params.get("search") || "")
      .trim();
  if (status !== "all") z.enum(stages).parse(status);
  if (family !== "all")
    z.string()
      .regex(/^[a-z][a-z0-9-]{1,39}$/)
      .parse(family);
  let from: string | undefined, until: string | undefined;
  if (day) {
    z.iso.date().parse(day);
    const start = new Date(day + "T00:00:00+05:30");
    from = start.toISOString();
    until = new Date(start.getTime() + 86400000).toISOString();
  }
  // PostgREST OR syntax never receives user-supplied separators/operators.
  const term = query
    .replace(/[^\p{L}\p{N}\s@.+_-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[\\%_]/g, (character) => "\\" + character);
  const conditions = term
    ? [`shipping->>name.ilike.%${term}%`, `shipping->>email.ilike.%${term}%`]
    : [];
  if (z.uuid().safeParse(query).success)
    conditions.push("id.eq." + query, "customer_id.eq." + query);
  const number = query.match(/^(?:DH[- ]?)?(\d{1,15})$/i)?.[1];
  if (number) conditions.push("number.eq." + number);
  return {
    status: status === "all" ? undefined : status,
    family: family === "all" ? undefined : family,
    from,
    until,
    or: conditions.length ? conditions.join(",") : undefined,
  };
}
export function orderSearchUrl(
  filters: { search: string; status: string; family: string; date: string },
  offset = 0,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters))
    if (value && value !== "all") params.set(key, value);
  if (offset) params.set("offset", String(offset));
  return "/api/orders" + (params.size ? "?" + params.toString() : "");
}
