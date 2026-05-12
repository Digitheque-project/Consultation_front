"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Hospital,
  FileText,
  CheckSquare,
  Archive,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavItems } from "@/hooks/use-nav-items";
import { mockLogout } from "@/lib/auth/mock-auth-browser";

const ICON_SIZE_CLASS = "w-[20px] h-[20px]";

const navIconMap: Record<string, { component: LucideIcon; strokeWidth: number }> = {
  "layout-dashboard": { component: LayoutDashboard, strokeWidth: 2.5 },
  hospital: { component: Hospital, strokeWidth: 2 },
  "file-text": { component: FileText, strokeWidth: 2 },
  "check-square": { component: CheckSquare, strokeWidth: 2 },
  archive: { component: Archive, strokeWidth: 2 },
};

type SidebarProps = {
  isOpen?: boolean;
  onClose?: () => void;
};

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { items: navItems, loading } = useNavItems();

  /** Plus long href qui matche : évite que /modules/clinical reste actif sur /modules/clinical/patients */
  const activeHref = useMemo(() => {
    // Si on est sur la page des notifications, on ne veut aucun menu actif
    if (pathname === "/modules/clinical/notification") {
      return null;
    }

    const matches = navItems.filter(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
    );
    if (matches.length === 0) return null;
    return matches.reduce((best, item) =>
      item.href.length > best.href.length ? item : best
    ).href;
  }, [pathname, navItems]);

  const isActive = (href: string) => href === activeHref;

  const handleLogout = () => {
    mockLogout();
    router.replace("/login");
    onClose?.();
  };

  return (
    <>
      {isOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px] md:hidden"
          onClick={onClose}
          aria-hidden
        />
      ) : null}
      <aside
        className={cn(
          "bg-white border-r border-[#F1F5F9] flex flex-col h-full shrink-0 shadow-[1px_0px_5px_rgba(0,0,0,0.01)] overflow-y-auto md:overflow-hidden z-50",
          "fixed inset-y-0 left-0 w-[82vw] max-w-[280px] transition-transform duration-200 md:static md:w-[220px] lg:w-[260px]",
          "md:rounded-tr-[24px] md:mt-2",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2 md:hidden">
          <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.2em]">
            Navigation
          </span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-colors"
            aria-label="Fermer la navigation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-4 sm:py-5 space-y-1.5">
          {loading
            ? Array.from({ length: 5 }).map((_, index) => (
              <div
                key={`nav-skeleton-${index}`}
                className="flex items-center gap-3 sm:gap-4 px-4 py-3 rounded-[12px] bg-[#F5F8FA] animate-pulse"
              >
                <div className="w-[20px] h-[20px] rounded-md bg-[#E2E8F0]" />
                <div className="h-[12px] w-32 rounded-full bg-[#E2E8F0]" />
              </div>
            ))
            : navItems.map((item) => {
              const active = isActive(item.href);
              const iconConfig = navIconMap[item.icon];
              const Icon = iconConfig?.component ?? FileText;
              const strokeWidth = iconConfig?.strokeWidth ?? 2;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 sm:gap-4 px-4 py-3 sm:py-3.5 rounded-[12px] transition-colors duration-200",
                    active
                      ? "bg-[#F0F7FF] text-[#006A8C] font-bold"
                      : "text-[#475569] hover:bg-gray-50 font-medium"
                  )}
                >
                  <span className={cn("shrink-0", active ? "text-[#006A8C] fill-[#006A8C]/10" : "text-[#64748B]")}>
                    <Icon className={ICON_SIZE_CLASS} strokeWidth={strokeWidth} />
                  </span>
                  <span className="text-[13px] sm:text-[14px]">{item.label}</span>
                </Link>
              );
            })}
        </nav>

        {/* Fleet Personnel Section */}
        <div className="px-4 sm:px-5 pb-5">
          <div className="bg-[#F5F8FA] rounded-[20px] sm:rounded-[24px] p-4 sm:p-6 relative overflow-hidden">
            <p className="text-[9px] sm:text-[10px] font-extrabold text-[#006A8C] uppercase tracking-[0.1em] mb-3 z-10 relative">
              NUMÉRO FLOTTE PERSONNEL
            </p>
            <p className="text-[12px] sm:text-[13px] font-bold text-gray-900 mb-5 z-10 relative leading-snug">
              Liste des contacts du<br />personnel
            </p>
            <button className="w-full bg-[#006A8C] hover:bg-[#005a76] transition-colors text-white text-[11px] sm:text-[12px] font-bold py-2 sm:py-2.5 rounded-xl z-10 relative">
              voir
            </button>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="px-4 sm:px-5 py-5 sm:py-6 space-y-5">
          <button className="flex items-center gap-3 px-4 text-gray-500 hover:text-gray-900 transition-colors w-full">
            <div className="w-5 h-5 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </div>
            <span className="text-[12px] sm:text-[13px] font-bold">Paramètres</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 text-[#E11D48] hover:text-red-700 transition-colors w-full"
          >
            <div className="w-5 h-5 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            </div>
            <span className="text-[12px] sm:text-[13px] font-bold">Déconnexion</span>
          </button>
        </div>
      </aside>
    </>
  );
}
