import type { Metadata } from "next";
import { LandingView } from "@/components/marketing/landing-view";

export const metadata: Metadata = {
  title: { absolute: "UniPilot AI" },
  description: "Your AI copilot for university work. From marksheets to university portals.",
};

export default function HomePage() {
  return <LandingView />;
}
