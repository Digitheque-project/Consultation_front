import React from "react";
import { X, User, MapPin, Stethoscope, Wallet, Check } from "lucide-react";
import { EnrichedNotification, PatientInfo } from "@/stores/notification-store";

interface PatientInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  notification?: EnrichedNotification;
  patientData?: PatientInfo;
  onAction?: () => void;
  actionLabel?: string;
}

export function PatientInfoModal({ 
  isOpen, 
  onClose, 
  notification, 
  patientData,
  onAction,
  actionLabel 
}: PatientInfoModalProps) {
  if (!isOpen) return null;

  const patient = (patientData || notification?.patient || {}) as Record<string, unknown>;
  const motif = notification?.motifHospitalisation || (patientData as any)?.motif || "";
  const pickString = (...values: unknown[]) => {
    for (const value of values) {
      if (typeof value === "string" && value.trim().length > 0) {
        return value;
      }
    }
    return undefined;
  };

  const formatValue = (value: unknown): string | null => {
    if (value === null || value === undefined) return null;
    if (Array.isArray(value)) {
      const items = value
        .map((item) => formatValue(item))
        .filter((item): item is string => Boolean(item));
      return items.length > 0 ? items.join(", ") : null;
    }
    if (typeof value === "object") {
      try {
        return JSON.stringify(value);
      } catch {
        return null;
      }
    }
    if (typeof value === "boolean") {
      return value ? "Oui" : "Non";
    }
    return String(value);
  };

  const formatDate = (value?: string) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("fr-FR");
  };

  const calculateAge = (birthDate?: string) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    if (Number.isNaN(birth.getTime())) return null;
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const nom = pickString(patient.nom, patient.lastName, patient.lastname);
  const prenom = pickString(patient.prenom, patient.firstName, patient.firstname);
  const fullName = pickString(`${nom ?? ""} ${prenom ?? ""}`.trim(), notification?.patientId) ??
    "Patient inconnu";
  const birthDate = pickString(
    patient.dateNaissance,
    patient.birthDate,
    patient.birthdate,
  );
  const age = calculateAge(birthDate);
  const sexe = pickString(patient.sexe, patient.gender, patient.sex) ?? "-";
  const cin = pickString(patient.cin, patient.cni, patient.numeroCin, patient.id);
  const profession = pickString(patient.profession, patient.job, patient.occupation);
  const adresse = pickString(patient.adresse, patient.address, patient.adresseComplete);
  const telephone = pickString(patient.telephone, patient.phone, patient.phoneNumber);
  const contactUrgence = pickString(
    patient.contactUrgence,
    patient.emergencyContact,
    patient.personneAContacter,
  );
  const email = pickString(patient.email, patient.mail);

  const knownKeys = new Set([
    "id",
    "patientId",
    "uuid",
    "nom",
    "prenom",
    "lastName",
    "lastname",
    "firstName",
    "firstname",
    "dateNaissance",
    "birthDate",
    "birthdate",
    "sexe",
    "gender",
    "sex",
    "cin",
    "cni",
    "numeroCin",
    "profession",
    "job",
    "occupation",
    "adresse",
    "address",
    "adresseComplete",
    "telephone",
    "phone",
    "phoneNumber",
    "contactUrgence",
    "emergencyContact",
    "personneAContacter",
    "email",
    "mail",
  ]);

  const extraEntries = Object.entries(patient)
    .filter(([key, value]) => !knownKeys.has(key) && value !== null && value !== undefined)
    .map(([key, value]) => ({
      label: key,
      value: formatValue(value),
    }))
    .filter((entry) => entry.value);

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
            {fullName}
          </h2>
          <p className="text-[13px] text-gray-500 font-medium">
            {age !== null ? `${age} ans` : "Âge inconnu"}
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
                  {fullName}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-1.5">
                  Sexe
                </p>
                <p className="text-[14px] font-bold text-[#1a1f36]">
                  {sexe}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-1.5">
                  Date de naissance
                </p>
                <p className="text-[14px] font-bold text-[#1a1f36]">
                  {formatDate(birthDate)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-1.5">
                  CIN / ID
                </p>
                <p className="text-[14px] font-bold text-[#1a1f36]">
                  {cin ?? "-"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-1.5">
                  Profession
                </p>
                <p className="text-[14px] font-bold text-[#1a1f36]">
                  {profession ?? "-"}
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
                  {adresse ?? "-"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-1.5">
                  Téléphone
                </p>
                <p className="text-[14px] font-bold text-[#1a1f36]">
                  {telephone ?? "-"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-1.5">
                  Contact d'urgence
                </p>
                <p className="text-[14px] font-bold text-[#008ba3]">
                  {contactUrgence ?? "-"}
                </p>
              </div>
            {email ? (
              <div>
                <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-1.5">
                  Email
                </p>
                <p className="text-[14px] font-bold text-[#1a1f36]">
                  {email}
                </p>
              </div>
            ) : null}
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
                  {motif || "-"}
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
                {formatValue(patient.priseEnCharge ?? patient.modePriseEnCharge) ? (
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#6EE7B7] text-[#047857] text-[13px] font-bold shadow-sm">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#047857] text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5" strokeWidth={3} />
                    </span>
                    {formatValue(patient.priseEnCharge ?? patient.modePriseEnCharge)}
                  </span>
                ) : (
                  <span className="px-4 py-1.5 rounded-full bg-gray-100/80 text-gray-600 text-[13px] font-semibold">
                    -
                  </span>
                )}
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
          {onAction && actionLabel && (
            <button
              onClick={() => {
                onAction();
                onClose();
              }}
              className="px-6 py-2.5 bg-[#005b82] hover:bg-[#004a6b] text-white rounded-xl text-[14px] font-bold transition-all shadow-sm active:scale-95"
            >
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
