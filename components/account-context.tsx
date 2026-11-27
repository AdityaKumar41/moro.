"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { usePathname } from "next/navigation";
type Profile = { id: string; name: string; email: string; role: string };
type Account = {
  status: "loading" | "guest" | "authenticated" | "error";
  profile: Profile | null;
  refresh: () => Promise<void>;
};
const Context = createContext<Account>({
  status: "loading",
  profile: null,
  refresh: async () => {},
});
export function AccountProvider({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [state, setState] = useState<Omit<Account, "refresh">>({
    status: "loading",
    profile: null,
  });
  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/profile", { cache: "no-store" });
      if (r.status === 401) {
        setState({ status: "guest", profile: null });
        return;
      }
      if (!r.ok) throw Error();
      setState({ status: "authenticated", profile: await r.json() });
    } catch {
      setState({ status: "error", profile: null });
    }
  }, []);
  useEffect(() => {
    void refresh();
    const focus = () => {
      void refresh();
    };
    window.addEventListener("focus", focus);
    return () => window.removeEventListener("focus", focus);
  }, [path, refresh]);
  return (
    <Context.Provider value={{ ...state, refresh }}>
      {children}
    </Context.Provider>
  );
}
export const useAccount = () => useContext(Context);
