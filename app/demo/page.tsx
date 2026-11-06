import DemoSandbox from "./DemoSandbox";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  path: "/demo",
  title: "Operations demo",
  description: "A walkthrough of how Twin Lanterns runs a household data collection pilot: sourcing, onboarding, recording, production tracking and delivery.",
  // Not indexed until Carlos approves the dataset and its public exposure.
  robots: { index: false, follow: false },
});

export default function DemoPage() {
  return <DemoSandbox />;
}
