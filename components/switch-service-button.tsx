"use client";

import { useState } from "react";
import { ChevronDown, Repeat } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export function SwitchServiceButton() {
  const { medecin, token } = useAuth();
  const [open, setOpen] = useState(false);

  const services = medecin?.otherServices ?? [];
  if (services.length === 0 || !token) return null;

  // Même mécanisme que la redirection depuis le service authentification :
  // le service cible lit le token via ?accessToken= (voir middleware.ts).
  function switchTo(baseUrl: string) {
    const separator = baseUrl.includes("?") ? "&" : "?";
    window.location.href = `${baseUrl}${separator}accessToken=${encodeURIComponent(token ?? "")}`;
  }

  return (
    <div className="relative self-start sm:self-auto">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl bg-[#005b82] px-4 py-2.5 text-[13px] font-bold text-white shadow-sm hover:bg-[#004a6b] transition-colors"
      >
        <Repeat className="w-4 h-4" />
        Changer de service
        <ChevronDown className="w-3.5 h-3.5 opacity-70" />
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-[2147483646]" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-gray-100 bg-white shadow-2xl overflow-hidden z-[2147483647]">
            {services.map((s) => (
              <button
                key={s.serviceId}
                type="button"
                onClick={() => switchTo(s.baseUrl as string)}
                className="w-full text-left px-4 py-3 text-[13px] font-semibold text-gray-700 hover:bg-[#EAF3FA] hover:text-[#005b82] transition-colors border-b border-gray-50 last:border-0"
              >
                {s.serviceName ?? "Service"}
                {s.roleName ? (
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">
                    {s.roleName}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
