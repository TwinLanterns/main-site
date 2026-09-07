import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

const dm = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm",
  display: "swap",
});

const site = "https://twin-lanterns.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: {
    default: "Twin Lanterns — Student talent, matched by hand",
    template: "%s · Twin Lanterns",
  },
  description:
    "Twin Lanterns is the bridge between ambitious high school and college students and the companies that need them. Screened candidates, scoped roles, real work.",
  openGraph: {
    title: "Twin Lanterns",
    description:
      "The bridge between ambitious students and the companies that need them.",
    url: site,
    siteName: "Twin Lanterns",
    type: "website",
  },
  icons: { icon: [{ url: "/mark.svg", type: "image/svg+xml" }] },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={dm.variable}>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-5 focus:py-2 focus:text-sm focus:text-white"
        >
          Skip to content
        </a>
        <Nav />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
