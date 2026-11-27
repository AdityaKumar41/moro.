import type { Metadata } from "next";
import { CatalogProvider } from "@/components/catalog-provider";
import { SiteFrame } from "@/components/site-frame";
import "@fontsource-variable/manrope";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/arimo/700.css";
import "@fontsource/tinos/700.css";
import "@fontsource/cousine/700.css";
import "./globals.css";
import "./design-system.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "./moro.css";
import "./workspace.css";
export const metadata: Metadata = {
  title: {
    default: "moro. — A little idea. A lasting impression.",
    template: "%s | moro.",
  },
  description:
    "Custom labels, race numbers, MTB boards, stamps, awards and laser-cut work. Configure, design and proof your next great idea.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <CatalogProvider>
          <SiteFrame sandbox={process.env.PAYMENTS_MODE === "test"}>
            {children}
          </SiteFrame>
        </CatalogProvider>
      </body>
    </html>
  );
}
