import type { Metadata } from "next";
import DataRequestForm from "./DataRequestForm";

export const metadata: Metadata = {
  title: "Get in touch",
  description:
    "Egocentric video, in-home video and speech data for AI and robotics teams. Send Twin Lanterns a message.",
};

export default function DataRequestPage() {
  return <DataRequestForm />;
}
