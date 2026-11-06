import GoproApplyFlow from "./GoproApplyFlow";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  path: "/earn/gopro/apply",
  title: "Sign up — Earn GoPro home program",
  description:
    "Sign up for Earn's GoPro home-collection program: record first-person video of tidying tasks in your own home.",
});

export default function EarnGoproApplyPage() {
  return <GoproApplyFlow />;
}
