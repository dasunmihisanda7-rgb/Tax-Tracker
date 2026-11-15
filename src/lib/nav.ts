import {
  ClipboardCheck,
  HandCoins,
  Landmark,
  LayoutDashboard,
  Settings,
  TriangleAlert,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

/** The seven screens from PLAN.md section 7, in sidebar order. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/tax-advice", label: "Tax Advice", icon: ClipboardCheck },
  { href: "/client-receipts", label: "Client Receipts", icon: HandCoins },
  { href: "/ird-payments", label: "IRD Payments", icon: Landmark },
  { href: "/outstanding", label: "Outstanding", icon: TriangleAlert },
  { href: "/settings", label: "Settings", icon: Settings },
];
