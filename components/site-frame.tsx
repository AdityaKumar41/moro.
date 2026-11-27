"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { AccountProvider } from "./account-context";
import { Header } from "./header";
export function SiteFrame({
  children,
  sandbox,
}: {
  children: React.ReactNode;
  sandbox: boolean;
}) {
  const path = usePathname();
  const isPublic = !["/account", "/admin", "/studio"].includes(path);
  const workspace = ["/studio", "/account", "/admin"].includes(path);
  const auth = path.startsWith("/auth");
  return (
    <AccountProvider>
      <div
        className={
          workspace
            ? "moro-app"
            : auth
              ? "moro-public moro-auth-frame"
              : isPublic
                ? "moro-public"
                : "moro-workspace"
        }
        data-preview={sandbox}
      >
        {!workspace && !auth && <Header />}
        {auth && (
          <div className="auth-appbar">
            <Link href="/" className="moro-logo" aria-label="Moro home">
              moro<span>.</span>
            </Link>
            <Link href="/products">Explore print products ↗</Link>
          </div>
        )}
        <main id="main">{children}</main>
        {!workspace && !auth && (
          <footer className="moro-footer">
            <div className="footer-top">
              <Link href="/" className="moro-logo" aria-label="Moro home">
                moro<span>.</span>
              </Link>
              <p>
                Small details.
                <br />
                Big possibilities.
              </p>
              <div className="footer-links">
                <Link href="/products">What we make</Link>
                <Link href="/studio">Design studio</Link>
                <Link href="/work">Inspiration</Link>
                <Link href="/account">Your account</Link>
                <Link href="/privacy">Privacy</Link>
                <Link href="/terms">Terms</Link>
              </div>
            </div>
            <div className="footer-bottom">
              <span>© {new Date().getFullYear()} Moro · by Digital Heroes</span>
              <Link href="/admin">Production workspace</Link>
              <span>
                {sandbox
                  ? "Preview · payments in test mode"
                  : "Made with care, in India."}
              </span>
            </div>
          </footer>
        )}
        {(workspace || auth) && sandbox && (
          <span className="workspace-disclosure">
            Preview · payments in test mode
          </span>
        )}
      </div>
    </AccountProvider>
  );
}
