"use client";

import React, { useState, useEffect } from "react";
import { User, Loader2 } from "lucide-react";
import { EnrichedNotification, useNotificationStore } from "@/stores/notification-store";
import { hospitalisationApi, StatutDemande } from "@/lib/api/instances/hospitalisation";
import { cn } from "@/lib/utils";
import { PatientInfoModal } from "./PatientInfoModal";
import { AttributionModal } from "./AttributionModal";
function formatRelativeTime(date: string | number | Date) {
  const now = new Date().getTime();
  const diff = now - new Date(date).getTime();
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  if (hours < 24) return `Il y a ${hours}h ${minutes % 60}min`;
  return `Il y a ${days} jour${days > 1 ? "s" : ""}`;
}

interface NotificationCardProps {
  notification: EnrichedNotification;
}

export function NotificationCard({ notification }: NotificationCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPatientInfo, setShowPatientInfo] = useState(false);
  const [showAttributionModal, setShowAttributionModal] = useState(false);
  const updateNotificationStatus = useNotificationStore((state) => state.updateNotificationStatus);
  const [relativeTime, setRelativeTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const time = formatRelativeTime(notification.receivedAt || notification.dateEntrer);
      setRelativeTime(time);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [notification.receivedAt, notification.dateEntrer]);

  const handleStatusUpdate = async (status: StatutDemande) => {
    setIsUpdating(true);
    try {
      await hospitalisationApi.updateStatus(notification.id, status);
      updateNotificationStatus(notification.id, status);
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const calculateAge = (birthDate?: string) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge(notification.patient?.dateNaissance);
  const patientName = notification.patient 
    ? `${notification.patient.nom || ""} ${notification.patient.prenom || ""}`.trim() 
    : "Patient inconnu";

  const sexeFormat = notification.patient?.sexe === "MALE" ? "HOMME" 
                   : notification.patient?.sexe === "FEMALE" ? "FEMME"
                   : notification.patient?.sexe || "HOMME";
  
  const isPending = notification.statusDemande === StatutDemande.EN_ATTENTE;
  const isAccepted = notification.statusDemande === StatutDemande.ACCEPTE;
  const isRefused = notification.statusDemande === StatutDemande.REFUSE;

  return (
    <div className="bg-white rounded-[20px] p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.02)] border border-gray-50 transition-all hover:shadow-[0px_8px_30px_rgba(0,0,0,0.04)]">
      <div className="flex justify-between items-center mb-6">
        <span className="text-[11px] font-bold text-gray-300 tracking-wider">
          {notification.patient
            ? `${notification.patient.nom ?? ""} ${notification.patient.prenom ?? ""}`.trim() || "Patient inconnu"
            : "Patient inconnu"}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-gray-500">{relativeTime}</span>
          <span className={cn("w-2 h-2 rounded-full", isPending ? "bg-[#0EA5E9]" : "bg-gray-200")}></span>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_1.5fr] gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-[16px] font-extrabold text-gray-900">{notification.type}</h3>
            <span className="px-2.5 py-1 rounded-full bg-[#D1FAE5] text-[#059669] text-[9.5px] font-bold uppercase tracking-wide">
              Banque
            </span>
          </div>
        </div>
        <div>
          <p className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest mb-1.5">
            Motif clinique
          </p>
          <p className="text-[13px] font-medium text-gray-600 line-clamp-1">
            {notification.motifHospitalisation}
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-full bg-[#F1F5F9] flex items-center justify-center">
            <User className="w-4 h-4 text-gray-400" />
          </div>
          <div>
            <p className="text-[12.5px] font-extrabold text-gray-900 uppercase">
              {patientName || "RAKOTOMALALA Sitraka"}
            </p>
            <p className="text-[9.5px] font-bold text-gray-400 tracking-wider uppercase mt-0.5">
              {age !== null ? `${age} ANS` : "ÂGE INCONNU"} • {sexeFormat}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2.5">
          {isUpdating ? (
            <div className="px-10 py-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#006A8C]" />
            </div>
          ) : (
            <>
              {isPending && (
                <>
                  <button 
                    onClick={() => handleStatusUpdate(StatutDemande.REFUSE)}
                    className="px-5 py-2 rounded-[10px] cursor-pointer border-[1.5px] border-red-100 text-[#E11D48] text-[12.5px] font-bold hover:bg-red-50 transition-colors"
                  >
                    Refuser
                  </button>
                  <button 
                    onClick={() => handleStatusUpdate(StatutDemande.ACCEPTE)}
                    className="px-6 py-2 rounded-[10px] cursor-pointer bg-[#006A8C] text-white text-[12.5px] font-bold hover:bg-[#005a76] transition-colors shadow-sm"
                  >
                    Accepter
                  </button>
                  <button
                    onClick={() => setShowPatientInfo(true)}
                    className="px-5 py-2 rounded-[10px] cursor-pointer border-[1.5px] border-[#006A8C] text-[#006A8C] text-[12.5px] font-bold hover:bg-[#006A8C] hover:text-white transition-colors"
                  >
                    Infos Patient
                  </button>
                </>
              )}

              {isAccepted && (
                <>
                <button
                    onClick={() => setShowPatientInfo(true)}
                    className="px-5 py-2 rounded-[10px] cursor-pointer border-[1.5px] border-[#006A8C] text-[#006A8C] text-[12.5px] font-bold hover:bg-[#006A8C] hover:text-white transition-colors"
                  >
                    Infos Patient
                  </button>
                  <button 
                    className="px-6 py-2 rounded-[10px] cursor-pointer bg-[#10B981] text-white text-[12.5px] font-bold hover:bg-[#059669] transition-colors shadow-sm"
                    onClick={() => setShowAttributionModal(true)}
                  >
                    Attribuer chambre / Lit
                  </button>
                </>
              )}

              {isRefused && (
                <span className="text-[12.5px] font-bold text-red-500 px-4 py-2 bg-red-50 rounded-lg">
                  Refusée
                </span>
              )}
            </>
          )}
        </div>
      </div>

      <PatientInfoModal 
        isOpen={showPatientInfo} 
        onClose={() => setShowPatientInfo(false)} 
        notification={notification} 
      />
      <AttributionModal
        isOpen={showAttributionModal}
        onClose={() => setShowAttributionModal(false)}
        notification={notification}
      />
    </div>
  );
}
