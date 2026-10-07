import { PortalShell } from "@/components/layout/portal-shell";

export default function PortalLayout({ children }: LayoutProps<"/">) {
  return <PortalShell>{children}</PortalShell>;
}
