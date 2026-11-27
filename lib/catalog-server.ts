import { createClient } from "@supabase/supabase-js";
import { divisions, productSchema, type Product } from "./catalog";
export async function catalogue(): Promise<Product[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
    return divisions;
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } },
  );
  const { data, error } = await db
    .from("products")
    .select("definition")
    .eq("active", true)
    .order("sort_order");
  if (error) throw new Error("Catalogue is temporarily unavailable");
  return data.length
    ? data.map((r) => productSchema.parse(r.definition))
    : divisions;
}
export async function catalogueProduct(id: string) {
  const p = (await catalogue()).find((p) => p.id === id);
  if (!p) throw Error("Product unavailable");
  return p;
}
