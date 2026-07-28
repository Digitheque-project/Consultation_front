"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ClipboardList, Archive, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { label: 'Dashboard', href: '/modules/consultation-externe/dashboard', icon: LayoutDashboard },
  { label: 'Fil de travail', href: '/modules/consultation-externe', icon: ClipboardList },
  { label: 'Archive', href: '/modules/consultation-externe/archive', icon: Archive },
  { label: 'Rapport', href: '/modules/consultation-externe/rapport', icon: BarChart2 },
];

const TAB_PATHS = new Set(TABS.map((t) => t.href));

export function ConsultationExterneTabs() {
  const pathname = usePathname();

  if (!TAB_PATHS.has(pathname)) return null;

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto">
        {TABS.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2 px-4 py-3.5 text-[13px] font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0',
                isActive
                  ? 'border-[#005b82] text-[#005b82]'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
