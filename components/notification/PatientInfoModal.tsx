import React from "react";
import { X, User, MapPin, Stethoscope, Wallet, Check } from "lucide-react";
import { EnrichedNotification } from "@/stores/notification-store";
import { cn } from "@/lib/utils";

interface PatientInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  notification: EnrichedNotification;
}

export function PatientInfoModal({ isOpen, onClose, notification }: PatientInfoModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 sm:p-6" onClick={onClose}>
      <div 
        className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header content section */}
        <div className="p-8 pb-6">
          <button 
            onClick={onClose}
            className="absolute top-8 right-8 p-1 cursor-pointer text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <p className="text-[10px] sm:text-[11px] font-bold text-gray-500 tracking-wider uppercase mb-2">
            Informations du patient
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1a1f36] leading-tight mb-1">
            Mbola Razafy
          </h2>
          <p className="text-[13px] text-gray-500 font-medium">
            42 ans
          </p>
        </div>

        {/* Info grids */}
        <div className="px-8 pb-8 flex flex-col gap-8">
          
          {/* Section 1: Identité */}
          <div className="flex gap-4">
            <div className="mt-1">
              <User className="w-5 h-5 text-[#008ba3]" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8 flex-1">
              <div>
                <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-1.5">
                  Nom Complet
                </p>
                <p className="text-[14px] font-bold text-[#1a1f36]">
                  Mbola Razafy
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-1.5">
                  Sexe
                </p>
                <p className="text-[14px] font-bold text-[#1a1f36]">
                  Femme
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-1.5">
                  Date de naissance
                </p>
                <p className="text-[14px] font-bold text-[#1a1f36]">
                  12/05/1983
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-1.5">
                  CIN / ID
                </p>
                <p className="text-[14px] font-bold text-[#1a1f36]">
                  123 456 789 012
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-1.5">
                  Profession
                </p>
                <p className="text-[14px] font-bold text-[#1a1f36]">
                  Enseignant
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Contact */}
          <div className="flex gap-4">
            <div className="mt-1">
              <MapPin className="w-5 h-5 text-[#008ba3]" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8 flex-1">
              <div className="sm:col-span-2">
                <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-1.5">
                  Adresse
                </p>
                <p className="text-[14px] font-bold text-[#1a1f36]">
                  Lot II 45 Bis, Andrainjato, Fianarantsoa
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-1.5">
                  Téléphone
                </p>
                <p className="text-[14px] font-bold text-[#1a1f36]">
                  +261 34 50 974 56
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-1.5">
                  Contact d'urgence
                </p>
                <p className="text-[14px] font-bold text-[#008ba3]">
                  +261 38 21 500 43
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Motif */}
          <div className="flex gap-4">
            <div className="mt-1">
              <Stethoscope className="w-5 h-5 text-[#008ba3]" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-2">
                Motif de consultation
              </p>
              <div className="bg-[#F8FAFC] rounded-xl p-4">
                <p className="text-[14px] font-medium text-gray-600 italic">
                  "Douleurs abdominales aiguës avec fièvre à 39°C depuis 2 jours."
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Prise en charge */}
          <div className="flex gap-4">
            <div className="mt-1">
              <Wallet className="w-5 h-5 text-[#008ba3]" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-3">
                Mode de prise en charge
              </p>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#6EE7B7] text-[#047857] text-[13px] font-bold shadow-sm">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#047857] text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5" strokeWidth={3} />
                  </span>
                  Banque
                </span>
                <span className="px-4 py-1.5 rounded-full bg-gray-100/80 text-gray-600 text-[13px] font-semibold">
                  Simple
                </span>
                <span className="px-4 py-1.5 rounded-full bg-gray-100/80 text-gray-600 text-[13px] font-semibold">
                  Cash
                </span>
                <span className="px-4 py-1.5 rounded-full bg-gray-100/80 text-gray-600 text-[13px] font-semibold">
                  Pivot
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="mt-auto bg-[#F8FAFC] px-8 py-5 flex items-center justify-end gap-4 rounded-b-3xl">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 cursor-pointer text-[14px] font-bold text-gray-600 hover:text-gray-900 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
