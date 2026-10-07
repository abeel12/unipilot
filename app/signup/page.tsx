import type { Metadata } from "next";
import { RegisterScreen } from "@/components/auth/account-screens";

export const metadata: Metadata = { title: "Sign Up" };

export default function SignupPage() {
  return <RegisterScreen />;
}
