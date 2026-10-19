import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { Analytics } from "@vercel/analytics/next";

const geist = Geist({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500"],
  variable: "--font-geist",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-geist-mono",
  display: "swap",
});

const site = "https://twinlanterns.co";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: {
    default: "Twin Lanterns — We capture the real world for AI",
    template: "%s · Twin Lanterns",
  },
  description:
    "Twin Lanterns captures real-world egocentric video, in-home video and speech for AI and robotics teams, run end to end from first recruit to final delivery.",
  openGraph: {
    title: "Twin Lanterns",
    description:
      "We capture the real world for AI: egocentric video, in-home video and speech, end to end.",
    url: site,
    siteName: "Twin Lanterns",
    type: "website",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "192x192" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: "/icon.png",
  },
  alternates: {
    canonical: "/",
  },
  verification: {
    other: {
      "msvalidate.01": "3A7AB2190FA3F842A117CD34926BD1F1",
    },
  },
};
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${site}/#organization`,
      name: "Twin Lanterns",
      alternateName: ["TwinLanterns", "Twin Lanterns Co"],
      legalName: "Twin Lanterns",
      url: site,
      logo: {
        "@type": "ImageObject",
        "@id": `${site}/#logo`,
        url: `${site}/icon.png`,
        contentUrl: `${site}/icon.png`,
        width: 192,
        height: 192,
        caption: "Twin Lanterns"
      },
      description:
        "Twin Lanterns captures real-world egocentric video, in-home video and speech for AI and robotics teams.",
      foundingDate: "2026", 
      sameAs: [
        "https://www.linkedin.com/company/twinlanterns",
        "https://www.instagram.com/choosetwinlanterns"
      ],
      contactPoint: {
        "@type": "ContactPoint",
        email: "hello@twinlanterns.co",
        contactType: "customer service",
        availableLanguage: ["English"]
      },
      address: {
        "@type": "PostalAddress",
        addressLocality: "Los Angeles",
        addressRegion: "CA",
        addressCountry: "US"
      },
       numberOfEmployees: { "@type": "QuantitativeValue", "value": 11 },
    },
    {
      "@type": "WebSite",
      "@id": `${site}/#website`,
      name: "Twin Lanterns",
      alternateName: ["TwinLanterns", "Twin Lanterns Co"],
      url: site,
      publisher: { "@id": `${site}/#organization` },
    }
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-100 focus:rounded-full focus:bg-ink focus:px-5 focus:py-2 focus:text-sm focus:text-white"
        >
          Skip to content
        </a>
        <Nav />
        <main id="main">{children}</main>
        <Footer />
        <Analytics />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}