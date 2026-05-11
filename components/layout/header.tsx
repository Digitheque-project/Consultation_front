"use client";

import { Bell, Menu } from "lucide-react";
import { useUserConfig } from "@/hooks/use-user-config";
import { useNotificationStore } from "@/stores/notification-store";

type HeaderProps = {
  onMenuClick?: () => void;
};

export function Header({ onMenuClick }: HeaderProps) {
  const { config } = useUserConfig();
  const unreadCount = useNotificationStore((state) => state.unreadCount);

  const hospitalName = config?.hospitalName;
  const doctorName = config?.doctorName;
  const speciality = config?.speciality;
  const avatarUrl = config?.avatarUrl;
  const notifications = (config?.notifications ?? 0) + unreadCount;

  return (
    <header className="bg-white border-b border-[#F1F5F9] px-4 sm:px-6 lg:px-7 py-2.5 sm:py-3 flex items-center justify-between z-10 shadow-[0px_4px_10px_rgba(0,0,0,0.015)]">
      {/* Left: Hospital Name */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-colors"
          aria-label="Ouvrir la navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="text-[16px] sm:text-[18px] lg:text-[20px] font-black text-[#004A66] tracking-tight truncate">
          {hospitalName}
        </div>
      </div>

      {/* Right: Notification & Profile */}
      <div className="flex items-center gap-4 sm:gap-5 lg:gap-10 pr-0 sm:pr-2">
        {/* Notification Bell */}
        <div className="relative cursor-pointer">
          <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700 stroke-[2]" />
          {notifications > 0 ? (
            <div className="absolute -top-1 -right-1 h-4 w-4 sm:h-[18px] sm:w-[18px] bg-[#E11D48] text-white text-[9px] sm:text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
              {notifications}
            </div>
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
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-200 rounded-full overflow-hidden border-2 border-[#EAF3FA] flex-shrink-0">
            <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    </header>
  );
}
