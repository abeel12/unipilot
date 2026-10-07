import type { Metadata } from "next";
import { RegisterScreen } from "@/components/auth/account-screens";

export const metadata: Metadata = { title: "Create Account" };

export default function RegisterPage() {
  return <RegisterScreen />;
}
