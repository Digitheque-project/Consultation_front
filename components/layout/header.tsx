"use client";

import { Bell } from "lucide-react";
import { useUserConfig } from "@/hooks/use-user-config";

export function Header() {
  const { config } = useUserConfig();

  const hospitalName = config?.hospitalName;
  const doctorName = config?.doctorName;
  const speciality = config?.speciality;
  const avatarUrl = config?.avatarUrl;
  const notifications = config?.notifications ?? 0;

  return (
    <header className="bg-white border-b border-[#F1F5F9] px-7 py-3 flex items-center justify-between z-10 shadow-[0px_4px_10px_rgba(0,0,0,0.015)]">
      {/* Left: Hospital Name */}
      <div className="text-[20px] font-black text-[#004A66] tracking-tight">
        {hospitalName}
      </div>

      {/* Right: Notification & Profile */}
      <div className="flex items-center gap-10 pr-2">
        {/* Notification Bell */}
        <div className="relative cursor-pointer">
          <Bell className="w-6 h-6 text-gray-700 stroke-[2]" />
          {notifications > 0 ? (
            <div className="absolute -top-1.5 -right-1.5 h-[18px] w-[18px] bg-[#E11D48] text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
              {notifications}
            </div>
          ) : null}
        </div>

        {/* Profile Section */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col text-right">
            <span className="text-[13px] font-extrabold text-gray-900 leading-tight">
              {doctorName}
            </span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight mt-0.5">
              {speciality}
            </span>
          </div>
          <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden border-2 border-[#EAF3FA] flex-shrink-0">
            <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    </header>
  );
}
