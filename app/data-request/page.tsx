import type { Metadata } from "next";
import DataRequestForm from "./DataRequestForm";

export const metadata: Metadata = {
  title: "Get in touch",
  description:
    "Scope a managed data collection pilot with Twin Lanterns, or ask about access to our collection operations platform.",
};

export default async function DataRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ interest?: string | string[] }>;
}) {
  const { interest } = await searchParams;
  return <DataRequestForm initialInterest={typeof interest === "string" ? interest : ""} />;
}
