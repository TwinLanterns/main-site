import SpeechApplyFlow from "./SpeechApplyFlow";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  path: "/earn/speech/apply",
  title: "Sign up — Earn speech program",
  description:
    "Sign up for the speech program: pair up for easy two-person conversations around Los Angeles on a body camera we supply. Ages 16+.",
});

export default function EarnSpeechApplyPage() {
  return <SpeechApplyFlow />;
}
