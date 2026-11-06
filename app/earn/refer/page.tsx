import AmbassadorFlow from "./AmbassadorFlow";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  path: "/earn/refer",
  title: "Become an ambassador — Earn",
  description: "Refer qualified applicants to Earn and get paid when they're hired.",
});

export default function EarnReferPage() {
  return <AmbassadorFlow />;
}