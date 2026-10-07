import type { Metadata } from "next";
import { ForgotScreen } from "@/components/auth/account-screens";

export const metadata: Metadata = { title: "Forgot Password" };

export default function ForgotPage() {
  return <ForgotScreen />;
}
