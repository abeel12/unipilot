import {
  BookOpen,
  ClipboardList,
  History,
  LayoutDashboard,
  Link2,
  ScrollText,
  Settings,
  Sparkles,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  mobile?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, mobile: true },
  { href: "/assistant", label: "AI Assistant", icon: Sparkles, mobile: true },
  { href: "/uploads/new", label: "Upload Marks", icon: Upload, mobile: true },
  { href: "/courses", label: "Courses", icon: BookOpen, mobile: true },
  { href: "/assessments", label: "Assessments", icon: ClipboardList },
  { href: "/students", label: "Students", icon: Users },
  { href: "/university-connection", label: "University Connection", icon: Link2 },
  { href: "/history", label: "Upload History", icon: History },
  { href: "/activity", label: "Activity Log", icon: ScrollText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const PAGE_META: Record<string, { title: string; subtitle?: string }> = {
  "/dashboard": { title: "Dashboard" },
  "/assistant": {
    title: "AI Assistant",
    subtitle: "Ask me to manage your university academic workflow.",
  },
  "/uploads/new": {
    title: "Upload Marks",
    subtitle: "Detect, review, and send marks to the university portal.",
  },
  "/courses": { title: "Courses", subtitle: "Every course linked to your faculty account." },
  "/assessments": { title: "Assessments", subtitle: "Grading sections across your courses." },
  "/students": { title: "Students", subtitle: "Roster, completion, and marks status." },
  "/university-connection": {
    title: "University Connection",
    subtitle: "Portal access stays on this page. Chat never sees credentials.",
  },
  "/history": { title: "Upload History", subtitle: "Every marks file you have prepared." },
  "/activity": { title: "Activity Log", subtitle: "An audit trail of faculty actions." },
  "/settings": { title: "Settings", subtitle: "Profile, appearance, and preferences." },
};
