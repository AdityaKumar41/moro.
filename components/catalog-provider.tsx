"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { divisions, type Product } from "@/lib/catalog";
const Context = createContext<Product[]>(divisions);
export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState(divisions);
  useEffect(() => {
    fetch("/api/catalog")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.length) setProducts(data);
      })
      .catch(() => {});
  }, []);
  return <Context.Provider value={products}>{children}</Context.Provider>;
}
export const useCatalog = () => useContext(Context);
