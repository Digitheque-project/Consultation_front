"use client";

import React, { useMemo, useState } from "react";
import { BedSingle, X } from "lucide-react";
import { EnrichedNotification } from "@/stores/notification-store";
import { cn } from "@/lib/utils";

interface AttributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  notification: EnrichedNotification;
}

type RoomStatus = "available" | "occupied";

type RoomOption = {
  id: string;
  label: string;
  type: string;
  availability: string;
  status: RoomStatus;
};

type BedStatus = "available" | "occupied";

type BedOption = {
  id: string;
  label: string;
  status: BedStatus;
};

const rooms: RoomOption[] = [
  {
    id: "204",
    label: "Ch. 204",
    type: "DOUBLE",
    availability: "1/2 dispo",
    status: "available",
  },
  {
    id: "205",
    label: "Ch. 205",
    type: "SALLE COMMUNE",
    availability: "2/4 dispo",
    status: "available",
  },
  {
    id: "208",
    label: "Ch. 208",
    type: "INDIVIDUELLE",
    availability: "Occupee",
    status: "occupied",
  },
  {
    id: "210",
    label: "Ch. 210",
    type: "DOUBLE",
    availability: "2/2 dispo",
    status: "available",
  },
];

const bedsByRoom: Record<string, BedOption[]> = {
  "204": [
    { id: "A", label: "Lit A", status: "occupied" },
    { id: "B", label: "Lit B", status: "available" },
  ],
  "205": [
    { id: "A", label: "Lit A", status: "available" },
    { id: "B", label: "Lit B", status: "available" },
  ],
  "208": [
    { id: "A", label: "Lit A", status: "occupied" },
    { id: "B", label: "Lit B", status: "occupied" },
  ],
  "210": [
    { id: "A", label: "Lit A", status: "available" },
    { id: "B", label: "Lit B", status: "available" },
  ],
};

export function AttributionModal({ isOpen, onClose, notification }: AttributionModalProps) {
  const [selectedRoom, setSelectedRoom] = useState("204");
  const [selectedBed, setSelectedBed] = useState("B");

  const rawPatientName = notification.patient
    ? `${notification.patient.nom || ""} ${notification.patient.prenom || ""}`.trim()
    : "";
  const patientName = rawPatientName.length > 0 ? rawPatientName : "Patient inconnu";
  const patientId = notification.patientId || notification.id ? String(notification.patientId || notification.id) : "-";

  const selectedRoomStatus = useMemo(
    () => rooms.find((room) => room.id === selectedRoom)?.status,
    [selectedRoom]
  );
  const beds = useMemo(() => bedsByRoom[selectedRoom] ?? [], [selectedRoom]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[760px] rounded-[18px] bg-white shadow-[0px_20px_60px_rgba(15,23,42,0.18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-5 top-5 text-gray-400 hover:text-gray-600"
          aria-label="Fermer la modale"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-6 pb-6 pt-6 sm:px-8 sm:pb-8">
          <div className="mb-6">
            <h2 className="text-[16px] font-extrabold text-[#111827]">
              Attribution Chambre & Lit
            </h2>
            <p className="mt-1 text-[11.5px] font-semibold text-gray-500">
              Patient: <span className="text-[#0EA5E9]">{patientName}</span> (ID: {patientId})
            </p>
          </div>

          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-gray-400">
                Selection de la chambre
              </p>
              <p className="text-[10px] font-semibold text-gray-400">
                Filtre par: <span className="text-gray-500">Chirurgie Viscerale</span>
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {rooms.filter((room) => room.status !== "occupied").map((room) => {
                const isSelected = selectedRoom === room.id;
                const isDisabled = room.status === "occupied";

                return (
                  <button
                    key={room.id}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => {
                      if (!isDisabled) {
                        setSelectedRoom(room.id);
                        const defaultBed = bedsByRoom[room.id]?.find((bed) => bed.status === "available");
                        setSelectedBed(defaultBed?.id ?? bedsByRoom[room.id]?.[0]?.id ?? "A");
                      }
                    }}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-[12px] border px-4 py-3 text-left transition-colors",
                      isSelected
                        ? "border-[#0EA5E9] bg-white shadow-[0px_6px_18px_rgba(14,165,233,0.12)]"
                        : "border-gray-200 bg-white",
                      isDisabled && "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-300"
                    )}
                  >
                    <p
                      className={cn(
                        "text-[12.5px] font-extrabold",
                        isSelected ? "text-[#0EA5E9]" : "text-gray-900",
                        isDisabled && "text-gray-300"
                      )}
                    >
                      {room.label}
                    </p>
                    <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-gray-400">
                      {room.type}
                    </p>
                    <div className="flex items-center gap-1.5 text-[9.5px] font-semibold">
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          room.status === "available" ? "bg-[#10B981]" : "bg-[#F97316]"
                        )}
                      ></span>
                      <span className={room.status === "available" ? "text-gray-600" : "text-[#F97316]"}>
                        {room.availability}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-6">
            <p className="mb-3 text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-gray-400">
              Selection du lit (Chambre {selectedRoom})
            </p>
            {selectedRoomStatus === "occupied" ? (
              <div className="rounded-[12px] border border-gray-200 bg-gray-50 px-4 py-3 text-[11.5px] font-semibold text-gray-400">
                Chambre occupee. Aucun lit disponible.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {beds.map((bed) => {
                  const isSelected = selectedBed === bed.id;
                  const isDisabled = bed.status === "occupied";

                  return (
                    <button
                      key={bed.id}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => !isDisabled && setSelectedBed(bed.id)}
                      className={cn(
                        "flex items-center gap-3 rounded-[12px] border px-4 py-3 text-left transition-colors",
                        isSelected ? "border-[#0EA5E9]" : "border-gray-200",
                        isDisabled && "cursor-not-allowed bg-gray-50 text-gray-300"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-[8px]",
                          isSelected ? "bg-[#E0F2FE]" : "bg-[#F8FAFC]",
                          isDisabled && "bg-gray-100"
                        )}
                      >
                        <BedSingle
                          className={cn(
                            "h-4 w-4",
                            isSelected ? "text-[#0EA5E9]" : "text-gray-400",
                            isDisabled && "text-gray-300"
                          )}
                        />
                      </div>
                      <div>
                        <p className="text-[12px] font-extrabold text-gray-900">{bed.label}</p>
                        <p
                          className={cn(
                            "text-[9.5px] font-semibold",
                            bed.status === "available" ? "text-[#10B981]" : "text-[#F97316]"
                          )}
                        >
                          {bed.status === "available" ? "Disponible" : "Occupe"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-gray-400">
                Date d'admission prevue
              </p>
              <input
                type="text"
                placeholder="mm/dd/yyyy, --:-- --"
                className="h-11 w-full rounded-[10px] border border-gray-200 bg-[#F8FAFC] px-4 text-[12px] font-semibold text-gray-600 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/40"
              />
            </div>
            <div>
              <p className="mb-2 text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-gray-400">
                Notes d'admission
              </p>
              <textarea
                rows={2}
                placeholder="Precisez les instructions specifiques..."
                className="min-h-[44px] w-full resize-none rounded-[10px] border border-gray-200 bg-[#F8FAFC] px-4 py-3 text-[12px] font-semibold text-gray-600 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/40"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={onClose}
              className="text-[12.5px] font-bold text-gray-500 hover:text-gray-700"
            >
              Annuler
            </button>
            <button
              type="button"
              className="rounded-[12px] bg-[#006A8C] px-5 py-2.5 text-[12.5px] font-extrabold text-white shadow-[0px_8px_18px_rgba(0,106,140,0.25)] hover:bg-[#005a76]"
            >
              Confirmer l'attribution
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
