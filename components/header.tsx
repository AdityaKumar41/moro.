"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAccount } from "./account-context";
import { Menu, X, UserRound } from "lucide-react";
export function Header() {
  const path = usePathname();
  const account = useAccount();
  const [open, setOpen] = useState(false);
  return (
    <header className="moro-header">
      <Link href="/" className="moro-logo" aria-label="Moro home">
        moro<span>.</span>
      </Link>
      <nav
        id="site-navigation"
        className={open ? "open" : ""}
        aria-label="Main navigation"
      >
        {[
          ["/products", "What we make"],
          ["/#how-it-works", "How it works"],
          ["/work", "Inspiration"],
        ].map(([href, label]) => (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={path === href ? "active" : ""}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="header-actions">
        <Link
          href={account.status === "guest" ? "/auth" : "/account"}
          className="moro-account"
          aria-label={
            account.status === "authenticated"
              ? "Your projects"
              : account.status === "guest"
                ? "Sign in"
                : "Checking your account"
          }
        >
          <UserRound size={17} />
          <span>
            {account.status === "loading" ? (
              <>
                <i
                  className="skeleton-block account-nav-skeleton"
                  aria-hidden="true"
                />
                <span className="sr-only">Checking your account</span>
              </>
            ) : account.status === "authenticated" ? (
              "Your projects"
            ) : (
              "Sign in"
            )}
          </span>
        </Link>
        <Link href="/studio" className="moro-button header-cta">
          Open the studio
        </Link>
        <button
          className="mobile-menu icon-button"
          aria-controls="site-navigation"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  );
}
