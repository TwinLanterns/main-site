import type { Metadata } from "next";
import DemoSandbox from "./DemoSandbox";

export const metadata: Metadata = {
  title: "Operations demo",
  description: "A walkthrough of how Twin Lanterns runs a household data collection pilot: sourcing, onboarding, recording, production tracking and delivery.",
  alternates: { canonical: "/demo" },
  // Not indexed until Carlos approves the dataset and its public exposure.
  robots: { index: false, follow: false },
};

export default function DemoPage() {
  return <DemoSandbox />;
}
