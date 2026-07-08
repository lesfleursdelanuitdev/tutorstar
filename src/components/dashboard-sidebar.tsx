"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Users,
  GraduationCap,
  BookOpen,
  Link2,
  CalendarDays,
  Package,
  Receipt,
  Settings,
} from "lucide-react";
import { AxolotlMark } from "@/components/axolotl-mark";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid, exact: true },
  { href: "/dashboard/clients", label: "Clients", icon: Users },
  { href: "/dashboard/students", label: "Students", icon: GraduationCap },
  { href: "/dashboard/subjects", label: "Subjects", icon: BookOpen },
  { href: "/dashboard/engagements", label: "Engagements", icon: Link2 },
  { href: "/dashboard/sessions", label: "Schedule", icon: CalendarDays },
  { href: "/dashboard/packages", label: "Packages", icon: Package },
  { href: "/dashboard/invoices", label: "Invoices", icon: Receipt },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
] as const;

type DashboardSidebarProps = {
  draftInvoiceCount?: number;
  className?: string;
};

export function DashboardSidebar({
  draftInvoiceCount = 0,
  className,
}: DashboardSidebarProps) {
  const pathname = usePathname();

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside
      className={`flex w-[230px] shrink-0 flex-col gap-1.5 rounded-r-[28px] px-3.5 py-6 ${className ?? ""}`}
      style={{ background: "var(--axo-ink)" }}
    >
      <Link
        href="/dashboard"
        className="mb-5 flex items-center gap-2 px-2.5"
      >
        <AxolotlMark size={30} gills={false} title="TutorStar" />
        <span className="font-display text-lg font-extrabold text-white">
          TutorStar
        </span>
      </Link>

      <nav className="flex flex-col gap-1">
        {NAV.map((item) => {
          const { href, label, icon: Icon } = item;
          const exact = "exact" in item ? item.exact : false;
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 rounded-full px-3.5 py-3 text-sm font-bold transition ${
                active
                  ? "bg-primary text-primary-content"
                  : "text-[color:var(--axo-muted)] hover:text-white"
              }`}
            >
              <Icon className="size-[17px] shrink-0" strokeWidth={2.2} />
              {label}
            </Link>
          );
        })}
      </nav>

      {draftInvoiceCount > 0 && (
        <div
          className="mt-auto flex flex-col gap-2 rounded-[20px] p-4"
          style={{ background: "var(--axo-aqua-tint-2)" }}
        >
          <AxolotlMark size={40} title="Axel" />
          <p className="text-[13px] font-extrabold leading-snug text-white">
            Axel says: {draftInvoiceCount}{" "}
            {draftInvoiceCount === 1 ? "invoice is" : "invoices are"} ready to
            send!
          </p>
          <Link
            href="/dashboard/invoices"
            className="text-[13px] font-extrabold text-info hover:underline"
          >
            Send them →
          </Link>
        </div>
      )}
    </aside>
  );
}
