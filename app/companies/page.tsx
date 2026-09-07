import type { Metadata } from "next";
import HireFlow from "./HireFlow";

export const metadata: Metadata = {
  title: "Hire a student",
  description:
    "Tell us the shape of the role. Twin Lanterns scopes it, sources against it, screens hard, and sends a shortlist of three to five within 48 hours.",
};

export default function CompaniesPage() {
  return <HireFlow />;
}
