import Link from "next/link";
import { Logo } from "@/components/shared/logo";

const FOOTER_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#workflow", label: "Workflow" },
  { href: "#pricing", label: "Pricing" },
  { href: "#security", label: "Security" },
  { href: "#faq", label: "FAQ" },
];

export function SiteFooter() {
  return (
    <footer className="px-4 pb-8 pt-16 md:px-6">
      <div className="glass-panel mx-auto grid max-w-6xl gap-8 rounded-3xl p-6 sm:grid-cols-2 lg:grid-cols-4 md:p-8">
        <div className="sm:col-span-2 lg:col-span-1">
          <Link href="/" aria-label="UniPilot AI home"><Logo /></Link>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Your AI copilot for university work. From marksheets to university portals, with the teacher still in control.
          </p>
        </div>
        <div>
          <p className="text-sm font-medium">Product</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {FOOTER_LINKS.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="hover:text-foreground">{item.label}</a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-medium">Account</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link href="/login" className="hover:text-foreground">Login</Link></li>
            <li><Link href="/register" className="hover:text-foreground">Sign up</Link></li>
            <li><Link href="/forgot-password" className="hover:text-foreground">Reset password</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-medium">Legal</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><a href="#security" className="hover:text-foreground">Privacy notes</a></li>
            <li><a href="#security" className="hover:text-foreground">Academic data</a></li>
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">University portal passwords are never collected.</p>
        </div>
      </div>
      <p className="mx-auto mt-4 max-w-6xl px-2 text-xs text-muted-foreground">© 2026 UniPilot AI. Faculty workflows, confirmed by you.</p>
    </footer>
  );
}
