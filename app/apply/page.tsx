import type { Metadata } from "next";
import ApplyFlow from "./ApplyFlow";

export const metadata: Metadata = {
  title: "Apply as a student",
  description:
    "One application, about four minutes. High school and college students welcome — Twin Lanterns keeps you in the pool for every role that fits.",
};

export default function ApplyPage() {
  return <ApplyFlow />;
}
