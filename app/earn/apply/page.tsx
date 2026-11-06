import EarnApplyFlow from "./EarnApplyFlow";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  path: "/earn/apply",
  title: "Apply — Earn",
  description:
    "Apply to film real-world tasks for Earn, Twin Lanterns' robotics data-collection vertical.",
});

export default function EarnApplyPage() {
  return <EarnApplyFlow />;
}