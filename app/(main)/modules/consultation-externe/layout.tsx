'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function ConsultationExterneLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const tabs = [
    { name: 'Accueil', path: '/modules/consultation-externe' },
    { name: 'Consultations en attente', path: '/modules/consultation-externe/consultations-waiting' },
    { name: 'Planning complet', path: '/modules/consultation-externe/planning-complet' },
    { name: 'Prescription', path: '/modules/consultation-externe/prescription' },
  ];

  // We hide the tabs for the "Traitement" view since it's a dedicated workspace
  const isTraitement = pathname?.includes('/traitement');

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      {!isTraitement && (
        <div className="bg-white border-b border-slate-200 px-6 shrink-0 shadow-sm z-10">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const isActive = pathname === tab.path;
              return (
                <Link
                  key={tab.path}
                  href={tab.path}
                  className={`py-4 px-2 border-b-2 text-sm font-bold transition-all ${
                    isActive
                      ? 'border-blue-700 text-blue-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                  }`}
                >
                  {tab.name}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
      <div className="flex-1 overflow-auto min-w-0">
        {children}
      </div>
    </div>
  );
}
