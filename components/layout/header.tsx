"use client";

import { useState } from "react";
import { Bell, Menu } from "lucide-react";
import { useUserConfig } from "@/hooks/use-user-config";
import { useDerivedNotifications } from "@/hooks/use-derived-notifications";
import { useBackendStatusStore } from "@/stores/backend-status-store";
import { useAuth } from "@/context/AuthContext";
import { NotificationPanel } from "@/components/notification-panel";

type HeaderProps = {
  onMenuClick?: () => void;
};

export function Header({ onMenuClick }: HeaderProps) {
  const { config } = useUserConfig();
  const { medecin } = useAuth();
  const { notifications } = useDerivedNotifications();
  const backendStatus = useBackendStatusStore((state) => state.status);
  const [panelOpen, setPanelOpen] = useState(false);

  const doctorName = medecin
    ? `${medecin.prenom} ${medecin.nom}`
    : config?.doctorName;
  const speciality = medecin?.specialite ?? config?.speciality;
  const avatarUrl = config?.avatarUrl;
  // Le logo du CHU vient du token (service-upload) : il peut changer, jamais figé en dur.
  const chuLogoUrl = medecin?.chuLogoUrl;

  // Pas de "tout marquer lu" à la fermeture : une notification ne doit disparaître
  // que si la consultation est traitée (ouverte) ou explicitement écartée.
  function closePanel() {
    setPanelOpen(false);
  }

  function togglePanel() {
    setPanelOpen((open) => !open);
  }

  return (
    <header className="bg-white border-b border-[#F1F5F9] px-4 sm:px-6 lg:px-7 py-2.5 sm:py-3 flex items-center justify-between z-10 shadow-[0px_4px_10px_rgba(0,0,0,0.015)]">
      {/* Left: Logo CHU + nom du service */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-colors"
          aria-label="Ouvrir la navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        {chuLogoUrl ? (
          <img
            src={chuLogoUrl}
            alt="Logo CHU"
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-full object-cover border border-[#EAF3FA] flex-shrink-0"
          />
        ) : null}
        <div className="text-[16px] sm:text-[18px] lg:text-[20px] font-black text-[#004A66] tracking-tight truncate">
          Consultation Externe
        </div>
      </div>

      {/* Center: Bonjour */}
      <div className="hidden md:block text-[13px] font-semibold text-gray-500 truncate">
        Bonjour{medecin?.prenom ? ` ${medecin.prenom}` : ""}
      </div>

      {/* Right: Notification & Profile */}
      <div className="flex items-center gap-4 sm:gap-5 lg:gap-10 pr-0 sm:pr-2">
        {/* Notification Bell */}
        <div className="relative">
          <button
            type="button"
            onClick={togglePanel}
            className="relative block cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700 stroke-[2]" />
            {notifications.length > 0 ? (
              <div className="absolute -top-1 -right-1 h-4 w-4 sm:h-[18px] sm:w-[18px] bg-[#E11D48] text-white text-[9px] sm:text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                {notifications.length}
              </div>
            ) : null}
          </button>
          {panelOpen ? (
            <>
              <div className="fixed inset-0 z-[2147483646]" onClick={closePanel} />
              <NotificationPanel onClose={closePanel} />
            </>
          ) : null}
        </div>

        {/* Profile Section */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex flex-col text-right min-w-0">
            <span className="text-[12px] sm:text-[12.5px] lg:text-[13px] font-extrabold text-gray-900 leading-tight truncate max-w-[140px] sm:max-w-[180px] lg:max-w-none">
              {doctorName}
            </span>
            <span className="hidden sm:block text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight mt-0.5 truncate">
              {speciality}
            </span>
          </div>
          <div className="relative w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0">
            <div className="w-full h-full bg-gray-200 rounded-full overflow-hidden border-2 border-[#EAF3FA]">
              <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
            </div>
            <span
              title={backendStatus === "ready" ? "Serveur prêt" : "Connexion au serveur en cours..."}
              className={`absolute bottom-0 right-0 h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full border-2 border-white ${
                backendStatus === "ready" ? "bg-emerald-500" : "bg-orange-400"
              }`}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
